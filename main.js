import dgram from "node:dgram";
import net from "node:net";
import { Parser } from "./parser.js";
import { options as defaultOptions, manual, version } from "./store.js";
import { Logger } from "./logger.js";
import { Request } from "./request/main.js";
import { Response } from "./response/main.js";
import {
    fail,
    setConf,
    setClient,
    allTransactionsFinished,
    serializeJson
} from "./utils.js";
import fs from "fs";

//export const client = dgram.createSocket("udp4");
export const trxMap = new Map();

function checkIfAskedInfo(options) {
    if (options.help) {
        console.log(manual);
        return true;
    }
    if (options.version) {
        console.log(version);
        return true;
    }
    return false;
}

export function cleanUp(options, client, log) {
    if (options.json) {
        const json = serializeJson(options, log);
        if (options.json_export) {
            try {
                fs.writeFileSync(
                    options.json_export,
                    JSON.stringify(json, null, 2)
                );
                log.info(`JSON output written to -> ${options.json_export}`);
            } catch (err) {
                log.error(err.message);
            }
        } else log.outmust(JSON.stringify(json, null, 2));
    }
    if (options.protocol === "tcp") client.end();
    else client.close();
}

function frameTcpDnsMessage(query) {
    const frame = Buffer.allocUnsafe(2 + query.length);

    frame.writeUInt16BE(query.length, 0);
    query.copy(frame, 2);

    return frame;
}

function setupSocket(options, client, log) {
    if (options.protocol === "tcp") {
        let receiveBuffer = Buffer.alloc(0);

        client.on("data", chunk => {
            receiveBuffer = Buffer.concat([receiveBuffer, chunk]);
            while (receiveBuffer.length >= 2) {
                const length = receiveBuffer.readUInt16BE(0);

                if (receiveBuffer.length < 2 + length) {
                    break;
                }

                const dnsMessage = receiveBuffer.subarray(2, 2 + length);

                receiveBuffer = receiveBuffer.subarray(2 + length);

                //   try {
                const response = new Response(options, log);

                response.parse(dnsMessage, trxMap);

                if (allTransactionsFinished()) {
                    cleanUp(options, client, log);
                }
                /*                 } catch (error) {
                    fail(`DNS parsing failed: ${error.message}`);
                    return;
                } */
            }
        });

        client.on("error", err => {
            fail(`tcp socket error: ${err.message}`);
        });
    } else {
        client.on("message", buffer => {
            //  try {
            const response = new Response(options, log);
            response.parse(buffer, trxMap);
            if (allTransactionsFinished()) {
                cleanUp(options, client, log);
            }
            //         } catch (error) {
            // fail(`DNS parsing failed: ${error.message}`);
            //   }
        });
        client.on("error", err => {
            fail(`udp socket error: ${err.message}`);
        });
    }
}

function sendRequests(options, client, log) {
    log.infov(`domains: [${options.domains.join(", ")}]`);

    const domains = options.batch
        ? [options.domains]
        : options.domains.map(domain => [domain]);

    for (const domainGroup of domains) {
        const request = new Request(options, log);
        const query = request.createQuery(domainGroup);

        const packet =
            options.protocol === "tcp" ? frameTcpDnsMessage(query) : query;

        request.send(packet, client, trxMap);
    }
}

function createSocket(options) {
    if (options.protocol === "tcp") {
        return net.createConnection({
            host: options.host,
            port: options.port
        });
    } else if (options.protocol === "udp") {
        return dgram.createSocket("udp4");
    } else fail(`Invalid protocol ${options.protocol}`);
}

function main() {
    const parser = new Parser(defaultOptions);

    const receivedOptions = parser.parse(process.argv.slice(2));

    if (checkIfAskedInfo(receivedOptions)) return;

    setConf(receivedOptions);

    const log = new Logger(receivedOptions);
    const options = parser.validate(receivedOptions, log);

    const client = createSocket(options);

    setClient(client, options);

    setupSocket(options, client, log);

    if (options.protocol === "tcp") {
        client.on("connect", () => {
            log.infov("tcp connection established");
            sendRequests(options, client, log);
        });
    } else {
        sendRequests(options, client, log);
    }
}

main();
