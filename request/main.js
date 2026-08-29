import { createTimeout } from "../utils.js";

export class Request {
    header;
    queryBuff;
    trxid;

    constructor(options, log) {
        this.options = options;
        this.log = log;
    }

    createHeader(qustion_count) {
        const buff = Buffer.alloc(12);
        this.trxid = Math.floor(Math.random() * Math.pow(2, 16));
        buff.writeUInt16BE(this.trxid, 0);
        buff.writeUInt16BE(0x0100, 2); // flags
        buff.writeUInt16BE(qustion_count, 4); // qustion count I am sending 1 query
        buff.writeUInt16BE(0, 6); // answer count 0 becaus client dont answer
        buff.writeUInt16BE(0, 8); // number authority records 1 for this
        buff.writeUInt16BE(0, 10); //  number additional records 1 for this
        return buff;
    }

    encodeDomain(name) {
        const labels = name.split(".");
        const parts = [];

        labels.map(label => {
            const bytes = Buffer.from(label, "ascii");
            parts.push(Buffer.from([bytes.length]));
            parts.push(bytes);
        });
        parts.push(Buffer.from([0])); // 0x00 marks the end
        return Buffer.concat(parts);
    }

    createQuery(domains) {
        this.header = this.createHeader(domains.length);
        this.domains = domains;

        const questions = [];
        for (const domain of domains) {
            const name = this.encodeDomain(domain);
            const question = Buffer.alloc(4);
            question.writeUInt16BE(this.options.type, 0); // QTYPE
            question.writeUInt16BE(1, 2); // QCLASS IN
            questions.push(name);
            questions.push(question);
        }
        this.queryBuff = Buffer.concat([this.header, ...questions]);
    }
    send(client, trxMap) {
        const data = {
            status: "pending",
            trxid: this.trxid,
            domains: this.domains,
            request: this,
            timeout: createTimeout(
                this.options,
                this.domains,
                this.trxid,
                this.log
            )
        };
        trxMap.set(this.trxid, data);
        this.date = Date.now();
       
        client.send(this.queryBuff, this.options.port, this.options.host);

        this.log.infov(
            `${this.date} sent:`,
            this.queryBuff.length,
            `bytes (${this.domains.join(", ")})`
        );

        if (this.options.raw) {
            this.log.space();
            this.log.out("=== sent(raw) ===");
            this.log.hexDump(this.queryBuff);
            this.log.space();
        }
    }
}
