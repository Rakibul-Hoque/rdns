import { CLASS_NAMES, TYPE_NAMES, RCODE_NAMES } from "../store.js";
import { fail } from "../utils.js";
import { ResponseUtil } from "./utils.js";
import { ResponseFormatter } from "./formatter.js";

export class Response {
    offset = 12;
    header = {};
    questions = [];
    answers = [];

    constructor(options, log) {
        this.options = options;
        this.log = log;
    }

    readHeader() {
        const trxid = this.buffer.readUInt16BE(0);
        const flags = this.buffer.readUInt16BE(2);

        const flagObj = {
            qr: (flags >> 15) & 1, // query response 0 q 1 r
            opcode: (flags >> 11) & 0x0f, // o for query
            aa: (flags >> 10) & 1, // authoritive answer 0 for not authoritive 1 for aauthoritive
            tc: (flags >> 9) & 1, // truncated 0 not not truncated 1 for truncated. if truncated user may retry through tcp
            rd: (flags >> 8) & 1, // recursion desired 1 resulving it recursively (client requsest)
            ra: (flags >> 7) & 1, // recursion available 0 for unavailable 1 available (server response)
            z: (flags >> 4) & 0x07, // reserved bits
            rcode: flags & 0x0f, // rcode
            rcodeName: RCODE_NAMES[flags & 0x0f] ?? "UNKNOWN"
        };

        this.header = {
            trxid,
            rawFlags: flags.toString(16),
            flags: flagObj,
            question_count: this.buffer.readUInt16BE(4),
            answer_count: this.buffer.readUInt16BE(6),
            authority_count: this.buffer.readUInt16BE(8),
            additional_count: this.buffer.readUInt16BE(10)
        };
    }

    readQuestion() {
        const name = this.util.readName(this.buffer, this.offset);
        this.offset = name.nextOffset;
        const type = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        const cls = this.buffer.readUInt16BE(this.offset);
        this.offset += 2;
        return {
            name: name.name,
            type,
            typeName: TYPE_NAMES[type] ?? `TYPE${type}`,
            class: cls,
            className: CLASS_NAMES[cls] ?? `CLASS${cls}`
        };
    }
    readRData(type, start, end) {
        const readers = {
            1: this.util.readA,
            2: this.util.readNS,
            5: this.util.readCNAME,
            6: this.util.readSOA,
            12: this.util.readPTR,
            15: this.util.readMX,
            16: this.util.readTXT,
            28: this.util.readAAAA,
            33: this.util.readSRV
        };

        const reader = readers[type];

        if (!reader) {
            return this.util.readUnknown(start, end);
        }

        return reader.call(this.util, start, end);
    }
    readAnswer() {
        const nameResult = this.util.readName(this.buffer, this.offset);
        this.offset = nameResult.nextOffset;
        this.log.debug(`decoding... ${nameResult.name}`);

        const type = this.buffer.readUInt16BE(this.offset); // answer type for ipv4, 1 is standard(ipv6 28)
        this.offset += 2;
        const cls = this.buffer.readUInt16BE(this.offset); // answer class 1 is standard
        this.offset += 2;
        const ttl = this.buffer.readUInt32BE(this.offset); // time out in seconds (4 bytes)
        this.offset += 4;
        const rdlength = this.buffer.readUInt16BE(this.offset); // data len commonly 4 for ipv4, but can be 32 for ipv6
        this.offset += 2;

        this.log.debug(`Offset: ${this.offset}`);
        this.log.debug(`Rdlength: ${rdlength}`);

        const rdataOffset = this.offset;
        const rdataEnd = rdataOffset + rdlength;

        if (rdataEnd > this.buffer.length) {
            fail("RDATA exceeds packet");
        }

        const data = this.readRData(type, rdataOffset, rdataEnd);

        this.offset = rdataEnd;

        return {
            name: nameResult.name,
            type,
            typeName: TYPE_NAMES[type] ?? `TYPE${type}`,
            class: cls,
            className: CLASS_NAMES[cls] ?? `CLASS${cls}`,
            ttl,
            rdlength,
            data
        };
    }

    parse(buffer, trxMap) {
        this.buffer = buffer;
        this.date = Date.now();
        this.log.infov(`${this.date} received:`, buffer.length, "bytes");
        if (this.options.raw) {
            this.log.space();
            this.log.out("=== received(raw) ===");
            this.log.hexDump(buffer);
            this.log.space();
        }

        this.readHeader();
        this.util = new ResponseUtil(this.buffer);
        this.formatter = new ResponseFormatter(this.log);

        const transaction = trxMap.get(this.header.trxid);
        if (!transaction) {
            this.log.error(`Unknown transaction ID: ${this.header.trxid}`);
            return;
        }
        clearTimeout(transaction.timeout);
        transaction.status = "responded";
        transaction.response = this;

        if (this.header.flags.rcode !== 0) {
            this.log.warn(`DNS server returned ${this.header.flags.rcodeName}`);
        }

        for (let i = 0; i < this.header.question_count; i++) {
            const question = this.readQuestion();
            this.questions.push(question);
        }

        for (let i = 0; i < this.header.answer_count; i++) {
            const answer = this.readAnswer();
            if (!answer) break;
            this.answers.push(answer);
        }

        if (this.answers.length === 0)
            this.log.info(
                `No answer records returned ${this.questions.map(q => q.name).join(", ")}`
            );
        this.formatter.format(this);
        transaction.status = "successful";
    }
}
