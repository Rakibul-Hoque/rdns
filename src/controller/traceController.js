import { BaseController } from "./baseController.js";
import { TYPE_NAMES, RCODE_NAMES, ROOT_SERVERS } from "../store.js";
import { fail } from "../utils.js";
import { DEFAULT } from "../cli/utils.js";
import { Response } from "../response/main.js";

export class TraceController extends BaseController {
    constructor(options, log, format) {
        super(options, log, format);

        this.target = options.domains[0];
        this.type = options.types[0];

        this.hop = 0;
        this.queryCount = 0;

        this.maxHops = options.traceMaxHops ?? 20;
        this.maxQueries = options.traceMaxQueries ?? 50;

        this.visitedServers = new Set();
        this.visitedNames = new Set();

        this.trace = [];
        this.finished = false;

        this.rootServers = ROOT_SERVERS;
    }

    async start() {
        this.log.infov(
            `starting trace for ${this.target} (${TYPE_NAMES[this.type] ?? this.type})`
        );

        try {
            const result = await this.runTrace();

            this.format.formatTrace(result);

            this.stop();

            return result;
        } finally {
            this.stop();
        }
    }

    setupSocket(client) {
        if (this.options.protocol === "tcp") {
            let buffer = Buffer.alloc(0);

            client.on("data", chunk => {
                buffer = Buffer.concat([buffer, chunk]);

                while (buffer.length >= 2) {
                    const length = buffer.readUInt16BE(0);

                    if (buffer.length < length + 2) break;

                    const frame = buffer.subarray(0, length + 2);
                    const packet = frame.subarray(2);

                    buffer = buffer.subarray(length + 2);

                    const date = Date.now();

                    this.log.infov(`${date} received:`, frame.length, "bytes");

                    this.format.hexDump(frame, "=== received(raw) ===");

                    try {
                        const response = new Response(
                            this.options,
                            this.log,
                            this.format
                        ).parse(packet, date);

                        this.trxMang.responded(response);
                    } catch (error) {
                        this.log.error(`DNS parsing failed: ${error.message}`);
                    } finally {
                        client.end();
                    }
                }
            });

            client.on("error", error => {
                this.log.error(`tcp socket error: ${error.message}`);
            });

            return;
        }

        client.on("message", buffer => {
            const date = Date.now();

            this.log.infov(`${date} received:`, buffer.length, "bytes");

            this.format.hexDump(buffer, "=== received(raw) ===");

            try {
                const response = new Response(
                    this.options,
                    this.log,
                    this.format
                ).parse(buffer, date);

                this.trxMang.responded(response);
            } catch (error) {
                this.log.error(`DNS parsing failed: ${error.message}`);
            } finally {
                client.close();
            }
        });

        client.on("error", error => {
            this.log.error(`udp socket error: ${error.message}`);
        });
    }

    async runTrace() {
        const server = this.getRootServer();

        try {
            const result = await this.traceName(
                this.target,
                this.type,
                server,
                {
                    serverDomain: "root",
                    traceKind: "main",
                    visitedServers: this.visitedServers,
                    visitedNames: this.visitedNames
                }
            );

            return this.finish(result.status, result.message, result.response);
        } catch (error) {
            const status =
                error.code === "TRACE_LIMIT"
                    ? "OUT_OF_LIMIT"
                    : error.code === "TRACE_LOOP"
                      ? "LOOP"
                      : "TRACE_FAILED";

            return this.finish(status, error.message);
        }
    }
    async traceName(
        name,
        type,
        server,
        {
            serverDomain = "root",
            traceKind = "main",
            visitedServers = new Set(),
            visitedNames = new Set()
        } = {}
    ) {
        while (!this.finished) {
            const limitReachedMsg = this.checkLimits();

            if (limitReachedMsg) {
                const error = new Error(limitReachedMsg);
                error.code = "TRACE_LIMIT";
                throw error;
            }

            const key = this.normalize(server);

            if (visitedServers.has(key)) {
                const error = new Error(`Trace loop detected at ${server}`);

                error.code = "TRACE_LOOP";
                throw error;
            }

            visitedServers.add(key);

            this.hop++;

            const client = this.createSocket({
                host: server,
                port: this.options.port
            });

            this.setupSocket(client);

            this.log.infov(`trace hop ${this.hop}: ${server}`);

            let response;

            try {
                response = await this.queryServer(
                    client,
                    {
                        host: server,
                        port: this.options.port
                    },
                    {
                        domains: [name],
                        type,
                        recursionDesired: false
                    }
                );
            } catch (error) {
                this.recordHop({
                    hop: this.hop,
                    server,
                    serverDomain,
                    name,
                    type,
                    traceKind,
                    error: error.message
                });

                throw error;
            } finally {
                client.destroy?.();
            }

            this.recordHop({
                hop: this.hop,
                server,
                serverDomain,
                name,
                type,
                traceKind,
                response
            });

            const result = this.analyze(response, name, type, visitedNames);

            if (result.done) {
                return {
                    ...result,
                    response,
                    server,
                    serverDomain
                };
            }

            if (result.kind === "cname") {
                name = result.name;
                continue;
            }

            if (result.kind === "referral") {
                let next = this.nextServer(
                    result.nameservers,
                    response,
                    visitedServers
                );

                if (next) {
                    server = next.address;
                    serverDomain = next.domain;

                    continue;
                }

                for (const nameserver of result.nameservers) {
                    try {
                        next = await this.traceNameserver(nameserver);

                        if (next) {
                            server = next.address;
                            serverDomain = next.domain;
                            break;
                        }
                    } catch (error) {
                        this.log.infov(
                            `failed to resolve nameserver ${nameserver}: ${error.message}`
                        );
                    }
                }

                if (next) {
                    continue;
                }

                throw new Error(`Could not resolve any nameserver`);
            }

            throw new Error("Could not determine the next trace step");
        }
    }

    async traceNameserver(name) {
        const server = this.getRootServer();

        const result = await this.traceName(
            name,
            1, // A
            server,
            {
                serverDomain: "root",
                traceKind: "nameserver",
                visitedServers: new Set(),
                visitedNames: new Set()
            }
        );

        if (result.status !== "ANSWER") {
            throw new Error(`Could not resolve nameserver ${name}`);
        }

        const answer = result.response.answers.find(
            record => record.type === 1 && this.sameName(record.name, name)
        );

        if (!answer?.data?.address) {
            throw new Error(`Nameserver ${name} has no A address`);
        }

        return {
            address: answer.data.address,
            domain: name
        };
    }

    analyze(response, name, type, visitedNames) {
        if (!response?.header) {
            return {
                done: true,
                status: "INVALID_RESPONSE",
                message: "Invalid DNS response"
            };
        }

        const flags = response.header.flags;
        const rcode = flags?.rcode ?? 0;

        if (flags?.qr !== 1) {
            return {
                done: true,
                status: "INVALID_RESPONSE",
                message: "Packet is not a DNS response"
            };
        }

        if (rcode === 3) {
            return {
                done: true,
                status: "NXDOMAIN",
                message: `${name} does not exist`
            };
        }

        if (rcode !== 0) {
            const status = flags?.rcodeName ?? RCODE_NAMES[rcode] ?? "UNKNOWN";

            return {
                done: true,
                status,
                message: `DNS server returned ${status}`
            };
        }

        const answer = response.answers.find(
            record => record.type === type && this.sameName(record.name, name)
        );

        if (answer) {
            return {
                done: true,
                status: "ANSWER",
                message: `${name} resolved successfully`
            };
        }

        const cname = response.answers.find(
            record => record.type === 5 && this.sameName(record.name, name)
        );

        if (cname) {
            const target = cname.data?.target;

            if (!target) {
                return {
                    done: true,
                    status: "INVALID_CNAME",
                    message: "CNAME has no target"
                };
            }

            const key = this.normalize(target);

            if (visitedNames.has(key)) {
                return {
                    done: true,
                    status: "CNAME_LOOP",
                    message: `CNAME loop detected at ${target}`
                };
            }

            visitedNames.add(key);

            return {
                done: false,
                kind: "cname",
                name: target
            };
        }

        const nameservers = response.authority
            .filter(record => record.type === 2)
            .map(record => record.data?.nameserver)
            .filter(Boolean);

        if (nameservers.length) {
            return {
                done: false,
                kind: "referral",
                nameservers
            };
        }

        if (response.authority.some(record => record.type === 6)) {
            return {
                done: true,
                status: "NODATA",
                message: `${name} has no ${TYPE_NAMES[type] ?? type} record`
            };
        }

        return {
            done: true,
            status: "NODATA",
            message: `No ${TYPE_NAMES[type] ?? type} answer returned`
        };
    }

    nextServer(nameservers, response, visited = this.visitedServers) {
        for (const name of nameservers) {
            const glue = response.additional.filter(
                record =>
                    (record.type === 1 || record.type === 28) &&
                    this.sameName(record.name, name)
            );

            const a = glue.find(record => record.type === 1);

            if (
                a?.data?.address &&
                !visited.has(this.normalize(a.data.address))
            ) {
                return {
                    address: a.data.address,
                    domain: name
                };
            }
        }

        return null;
    }

    recordHop(data) {
        this.trace.push(data);
    }

    checkLimits() {
        if (this.hop >= this.maxHops) {
            return `Trace exceeded ${this.maxHops} hops`;
        }

        if (this.queryCount >= this.maxQueries) {
            return `Trace exceeded ${this.maxQueries} queries`;
        }

        this.queryCount++;

        return undefined;
    }

    sameName(a, b) {
        return this.normalize(a) === this.normalize(b);
    }

    normalize(value) {
        return String(value ?? "")
            .toLowerCase()
            .replace(/\.$/, "");
    }

    getRootServer() {
        if (this.options.host !== DEFAULT.host) {
            return this.options.host;
        }
        return this.rootServers[
            Math.floor(Math.random() * this.rootServers.length)
        ];
    }

    finish(status, message, response = null) {
        this.finished = true;

        return {
            target: this.target,
            type: this.type,
            typeName: TYPE_NAMES[this.type] ?? `TYPE${this.type}`,
            status,
            message,
            hops: this.hop,
            queries: this.queryCount,
            trace: this.trace,
            response
        };
    }
}
