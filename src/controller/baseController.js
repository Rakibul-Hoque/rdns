import dgram from "node:dgram";
import net from "node:net";
import fs from "fs";
import { TransactionManager } from "./transactionManager.js";
import { Request } from "../request/main.js";
import { TYPE_NAMES } from "../store.js";
import { fail, serializeJson } from "../utils.js";

export class BaseController {
    constructor(options, log, format) {
        this.options = options;
        this.log = log;
        this.format = format;

        this.client = null;
        this.trxMang = new TransactionManager(log);

        this.closed = false;
    }

    async start() {
        throw new Error("start() must be implemented");
    }

    stop() {
        if (this.closed) return;

        if (this.options.json || this.options.json_export) {
            const json = serializeJson(this.options, this.trxMang);
            if (this.options.json_export) {
                try {
                    fs.writeFileSync(
                        this.options.json_export,
                        JSON.stringify(json, null, 2)
                    );
                    this.log.info(
                        `JSON output written to -> ${this.options.json_export}`
                    );
                } catch (err) {
                    this.log.error(err.message);
                }
            } else this.log.outmust(JSON.stringify(json, null, 2));
        }

        this.closed = true;

        if (!this.client) return;

        if (this.options.protocol === "tcp") {
            this.client.end();
        } else {
            this.client.close();
        }
    }

    createSocket({ host, port }) {
        if (this.options.protocol === "tcp") {
            return net.createConnection({ host, port });
        } else if (this.options.protocol === "udp") {
            return dgram.createSocket("udp4");
        } else fail(`Invalid protocol ${this.options.protocol}`);
    }
    frameTcpDnsMessage(query) {
        const frame = Buffer.allocUnsafe(2 + query.length);

        frame.writeUInt16BE(query.length, 0);
        query.copy(frame, 2);

        return frame;
    }
    async queryServer(client, serverAdd, queryParams) {
        return new Promise((resolve, reject) => {
            const request = new Request(this.options, this.log, this.format);

            const query = request.createQuery(queryParams);

            const packet =
                this.options.protocol === "tcp"
                    ? this.frameTcpDnsMessage(query)
                    : query;

            const transaction = {
                trxid: request.trxid,
                status: "pending",
                server: serverAdd,
                domains: request.domains,
                request,
                resolve,
                reject
            };

            transaction.timeout = setTimeout(() => {
                this.trxMang.timeout(
                    request.trxid,
                    `DNS request timed out for ${request.domains.join(", ")} ` +
                        `(ID: ${request.trxid})`
                );
                process.exitCode = 1;
                if (this.trxMang.allFinished()) this.stop();
            }, this.options.timeout);

            this.trxMang.add(transaction);

            request.send(packet, client, serverAdd);

            this.log.infov(
                `${request.date} sent:`,
                packet.length,
                `bytes (${request.domains.join(", ")}) ${TYPE_NAMES[request.type]}`
            );
            this.format.hexDump(packet, "=== sent(raw) ===");
        });
    }
}
