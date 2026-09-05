import { TYPE_NAMES } from "../store.js";

export class Request {
    constructor(options, log, format) {
        this.options = options;
        this.log = log;
        this.format = format;
    }

    createHeader(qustion_count, recursionDesired) {
        const buff = Buffer.alloc(12);
        this.trxid = Math.floor(Math.random() * Math.pow(2, 16));
        buff.writeUInt16BE(this.trxid, 0);

        if (recursionDesired) buff.writeUInt16BE(0x0100, 2);
        else buff.writeUInt16BE(0x0000, 2);
        // flags
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

    createQuery(op) {
        const {
            domains,
            type,
            cls = this.options.class,
            recursionDesired = true
        } = op;
        this.header = this.createHeader(domains.length, recursionDesired);
        this.domains = domains;
        this.type = type;
        const questions = [];
        for (const domain of domains) {
            const name = this.encodeDomain(domain);
            const question = Buffer.alloc(4);
            // question.writeUInt16BE(this.options.type, 0); // QTYPE
            question.writeUInt16BE(type, 0); // QTYPE
            question.writeUInt16BE(cls, 2); // QCLASS IN
            questions.push(name);
            questions.push(question);
        }
        return Buffer.concat([this.header, ...questions]);
    }

    send(buffer, client, { host, port }) {
        this.queryBuff = buffer;

        this.date = Date.now();

        if (this.options.protocol === "tcp") {
            client.write(buffer);
        } else if (this.options.protocol === "udp") {
            client.send(buffer, port, host);
        }
    }
}
