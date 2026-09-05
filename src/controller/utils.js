import { serializeJson } from "../utils.js";
import fs from "fs";

export function cleanUp(options, client, trxMang, log) {
    if (options.json) {
        const json = serializeJson(options, trxMang);
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
    if (client && !client.destroyed) {
        if (options.protocol === "tcp") client.end();
        else client.close();
    }
}

export function createTimeout(options, client, domains, trxid, trxMang, log) {
    return setTimeout(() => {
        
        trxMang.timeout(trxid,`DNS request timed out for ${domains.join(", ")} ` +
                `(ID: ${trxid})`);

        process.exitCode = 1;
        if (trxMang.allFinished()) cleanUp(options, client, trxMang, log);
    }, options.timeout);
}
