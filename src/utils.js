import { COLORS } from "./store.js";
import { VERSION } from "./cli/version.js";

let conf = {
    color: true
};

export function setConf(options) {
    conf.color = options.color;
}

export function logError(message) {
    if (!conf.color) {
        console.error("[ERROR]", message);
        return;
    }
    console.error(`${COLORS.red}[ERROR]${COLORS.reset}`, message);
}

export function fail(message) {
    logError(message);
    process.exit(1);
}
export function cliFail(message) {
    logError(message);
    process.exit(2);
}

export function serializeJson(options, trxMang) {
    const transactions = [...trxMang.values()].map(t => ({
        id: t.trxid,
        status: t.status,
        domains: t.domains,
        server: t.server,
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
                        type: t.request.type,
                        class: options.class
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
                      questions: t.response.questions,
                      answers: t.response.answers,
                      authority: t.response.authority,
                      additional: t.response.additional
                  }
              }
            : null
    }));

    return {
        version: VERSION,
        tool: {
            name: "rdns",
            author: "rakib"
        },
        query: {
            protocol: options.protocol,
            types: options.type,
            domains: options.domains
        },
        transactions: transactions.length === 0 ? null : transactions
    };
}
