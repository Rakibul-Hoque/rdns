import { BaseController } from "./baseController.js";
import { TYPE_NAMES, RCODE_NAMES, ROOT_SERVERS } from "../store.js";
import { fail } from "../utils.js";
import { cleanUp } from "./utils.js";
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

cleanUp(this.options, null, this. trxMang, this
.log)

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
        let server = this.getRootServer();
        let name = this.target;

        while (!this.finished) {
            const limitReachedMsg = this.checkLimits();
            if (limitReachedMsg) {
                this.log.error(limitReachedMsg);
                return this.finish("OUT_OF_LIMITE", limitReachedMsg);
            }
            const key = this.normalize(server);

            if (this.visitedServers.has(key)) {
                return this.finish("LOOP", `Trace loop detected at ${server}`);
            }

            this.visitedServers.add(key);
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
                        type: this.type,
                        recursionDesired: false
                    }
                );
            } catch (error) {
                this.recordHop({
                    hop: this.hop,
                    server,
                    name,
                    type: this.type,
                    error: error.message
                });

                client.destroy?.();

                return this.finish("TIMEOUT", `${server} did not respond`);
            }

            client.destroy?.();

            this.recordHop({
                hop: this.hop,
                server,
                name,
                type: this.type,
                response
            });

            const result = this.analyze(response, name);

            if (result.done)
                return this.finish(result.status, result.message, response);

            if (result.kind === "cname") {
                name = result.name;
                continue;
            }

            if (result.kind === "referral") {
                const next = this.nextServer(result.nameservers, response);

                if (!next) {
                    return this.finish(
                        "NO_GLUE",
                        "No usable nameserver address found",
                        response
                    );
                }

                server = next;
                continue;
            }

            return this.finish(
                "UNKNOWN",
                "Could not determine the next trace step",
                response
            );
        }
    }

    analyze(response, name) {
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
            record =>
                record.type === this.type && this.sameName(record.name, name)
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

            if (this.visitedNames.has(key)) {
                return {
                    done: true,
                    status: "CNAME_LOOP",
                    message: `CNAME loop detected at ${target}`
                };
            }

            this.visitedNames.add(key);

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
                message: `${name} has no ${TYPE_NAMES[this.type] ?? this.type} record`
            };
        }

        return {
            done: true,
            status: "NODATA",
            message: `No ${TYPE_NAMES[this.type] ?? this.type} answer returned`
        };
    }

    nextServer(nameservers, response) {
        for (const name of nameservers) {
            const glue = response.additional.filter(
                record =>
                    (record.type === 1 || record.type === 28) &&
                    this.sameName(record.name, name)
            );

            /*
             * Prefer A when using udp4.
             */
            const a = glue.find(record => record.type === 1);

            if (
                a?.data?.address &&
                !this.visitedServers.has(this.normalize(a.data.address))
            ) {
                return a.data.address;
            }

            /*
             * If your BaseController later supports udp6,
             * AAAA can be selected here too.
             */
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
