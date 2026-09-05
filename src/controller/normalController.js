import { BaseController } from "./baseController.js";
import { fail } from "../utils.js";
import { cleanUp, createTimeout } from "./utils.js";
import { TYPE_NAMES } from "../store.js";
import { Request } from "../request/main.js";
import { Response } from "../response/main.js";

export class NormalController extends BaseController {
    async start() {
        this.serverAdd = {
            host: this.options.host,
            port: this.options.port
        };
        this.client = this.createSocket(this.serverAdd);
        this.setupSocket();

        if (this.options.protocol === "tcp") {
            this.client.on("connect", () => {
                this.log.infov("tcp connection established");
                this.sendRequests();
            });
        } else {
            this.sendRequests();
        }
    }

    setupSocket() {
        if (this.options.protocol === "tcp") {
            let receiveBuffer = Buffer.alloc(0);

            this.client.on("data", chunk => {
                receiveBuffer = Buffer.concat([receiveBuffer, chunk]);
                while (receiveBuffer.length >= 2) {
                    const length = receiveBuffer.readUInt16BE(0);

                    if (receiveBuffer.length < 2 + length) {
                        break;
                    }

                    const frame = receiveBuffer.subarray(0, 2 + length);

                    const dnsMessage = frame.subarray(2);

                    receiveBuffer = receiveBuffer.subarray(2 + length);

                    const date = Date.now();
                    this.log.infov(`${date} received:`, frame.length, "bytes");
                    this.format.hexDump(frame, "=== received(raw) ===");

                    try {
                    this.processResponse(dnsMessage, date);
                                    } catch (error) {
                    fail(`DNS parsing failed: ${error.message}`);
                    return;
                }
                }
            });

            this.client.on("error", err => {
                fail(`tcp socket error: ${err.message}`);
            });
        } else {
            this.client.on("message", buffer => {
                const date = Date.now();
                this.log.infov(`${date} received:`, buffer.length, "bytes");
                this.format.hexDump(buffer, "=== received(raw) ===");

                 try {
                this.processResponse(buffer, date);
                            } catch (error) {
                                fail(`DNS parsing failed: ${error.message}`);
                            }
            });
            this.client.on("error", err => {
                fail(`udp socket error: ${err.message}`);
            });
        }
    }
    processResponse(buffer, date) {
        const response = new Response(
            this.options,
            this.log,
            this.format
        ).parse(buffer, date);

        this.trxMang.responded(response);
        this.format.formatResponse(response);


        if (this.trxMang.allFinished()) {
            cleanUp(this.options, this.client, this.trxMang, this.log);
        }
    }

    sendRequests() {
        const domainGroups = this.options.batch
            ? [this.options.domains]
            : this.options.domains.map(d => [d]);

        for (const domainGroup of domainGroups) {
            for (const type of this.options.types) {
                this.queryServer(this.client, this.serverAdd, {
                    domains: domainGroup,
                    type,
                    recursionDesired: true
                }).catch(error => {
                    fail(error.message);
                    throw error;
                });
            }
        }
    }
}
