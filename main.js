import dgram from "node:dgram";
import { Parser } from "./parser.js";
import { options as defaultOptions, manual, version } from "./store.js";
import { Logger } from "./logger.js";
import { Request } from "./request/main.js";
import { Response } from "./response/main.js";
import {
    fail,
    setConf,
    allTransactionsFinished,
    serializeJson
} from "./utils.js";
import fs from "fs";

export const client = dgram.createSocket("udp4");
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

export function cleanUp(options, log) {
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

    client.close();
}

function setupSocket(options, log) {
    client.on("message", buffer => {
        //  try {
        const response = new Response(options, log);
        response.parse(buffer, trxMap);
        /*     } catch (error) {
      fail(`DNS parsing failed: ${error.message}`);
      throw error;
    } */
        if (allTransactionsFinished()) {
            cleanUp(options, log);
        }
    });
    client.on("error", err => {
        fail("UDP socket error:", err.message);
    });
}

function sendRequests(options, log) {
    log.infov(`domains: [${options.domains.join(", ")}]`);
    if (options.batch) {
        const request = new Request(options, log);
        request.createQuery(options.domains);
        request.send(client, trxMap);
        return;
    }
    for (const domain of options.domains) {
        const request = new Request(options, log);
        request.createQuery([domain]);
        request.send(client, trxMap);
    }
}

function main() {
    const parser = new Parser(defaultOptions);

    const receivedOptions = parser.parse(process.argv.slice(2));

    if (checkIfAskedInfo(receivedOptions)) {
        client.close();
        return;
    }

    setConf(receivedOptions);

    const log = new Logger(receivedOptions);
    const options = parser.validate(receivedOptions, log);

    setupSocket(options, log);
    sendRequests(options, log);
}

main();
