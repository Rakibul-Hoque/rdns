import { trxMap, cleanUp } from "./main.js";
import { COLORS } from "./store.js";

let conf = {
    color: true
};
let client;
let options;

export function setConf(options) {
    conf.color = options.color;
}
export function setClient(Client, Options) {
    client = Client;
    options = Options;
}

function logError(message) {
    if (!conf.color) {
        console.error("[ERROR]", message);
        return;
    }
    console.error(`${COLORS.red}[ERROR]${COLORS.reset}`, message);
}

export function fail(message) {
    logError(message);
    if (client !== undefined && !client.destroyed) {
        if (options.protocol === "tcp") client.end();
        else client.close();
    }
    process.exit(1);
}
export function cliFail(message) {
    logError(message);
    if (client !== undefined && !client.destroyed) {
        if (options.protocol === "tcp") client.end();
        else client.close();
    }
    process.exit(2);
}

export function serializeJson(options) {
    const transactions = [...trxMap.values()].map(t => ({
        id: t.trxid,
        status: t.status,
        domains: t.domains,
        responseDurationMs:
            t.request && t.response ? t.response.date - t.request.date : null,
        request: {
            date: t.request?.date,
            raw: {
                buffer: t.request?.queryBuff
                    ? t.request.queryBuff.toString("hex")
                    : null,
                length: t.request?.queryBuff ? t.request.queryBuff.length : null
            },
            decoded: {
                trxid: t.request.trxid,
                questions: t.request.domains.map(d => {
                    return {
                        domain: d,
                        type: options.ip_type,
                        class: options.ip_class
                    };
                })
            }
        },

        response: t.response
            ? {
                  date: t.response?.date,
                  raw: {
                      buffer: t.response?.buffer
                          ? t.response.buffer.toString("hex")
                          : null,
                      length: t.response?.buffer
                          ? t.response.buffer.length
                          : null
                  },
                  decoded: {
                      header: t.response.header,
                      questions:
                          t.response.questions.length === 0
                              ? null
                              : t.response.questions,
                      answers:
                          t.response.answers.length === 0
                              ? null
                              : t.response.answers,
                      authority:
                          t.response.authority.length === 0
                              ? null
                              : t.response.authority,
                      additional:
                          t.response.additional.length === 0
                              ? null
                              : t.response.additionals
                  }
              }
            : null
    }));

    return {
        protocol: options.protocol,
        host: options.host,
        port: options.port,
        ip_type: options.ip_type,
        domains: options.domains,
        transactions: transactions.length === 0 ? null : transactions
    };
}

export function allTransactionsFinished() {
    for (const transaction of trxMap.values()) {
        if (transaction.status === "pending") {
            return false;
        }
    }
    return true;
}

export function createTimeout(options, client, domains, trxid, log) {
    return setTimeout(() => {
        
        log.error(
            `DNS request timed out for ${domains.join(", ")} ` +
                `(ID: ${trxid})`
        );
        const transaction = trxMap.get(trxid);
        if (transaction) {
            transaction.status = "timeout";
        }
        process.exitCode = 1;
        if (allTransactionsFinished()) cleanUp(options, client, log);
    }, options.timeout);
}
