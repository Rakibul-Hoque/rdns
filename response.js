import { CLASS_NAMES, RCODE_NAMES } from "./store.js";

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
      rcodeName: RCODE_NAMES[flags & 0x0f] ?? "UNKNOWN",
    };

    this.header = {
      trxid,
      rawFlags: flags.toString(16),
      flags: flagObj,
      question_count: this.buffer.readUInt16BE(4),
      answer_count: this.buffer.readUInt16BE(6),
      authority_count: this.buffer.readUInt16BE(8),
      additional_count: this.buffer.readUInt16BE(10),
    };
  }

  readName(buffer, offset) {
    const labels = [];

    let position = offset;
    let jumped = false;
    let nextOffset = offset;

    const visited = new Set();
    while (true) {
      if (position >= buffer.length) {
        throw new Error("DNS name exceeds packet");
      }

      if (visited.has(position)) {
        throw new Error("DNS name compression loop");
      }

      visited.add(position);

      const length = buffer[position];
      // End of normal DNS name
      if (length === 0) {
        if (!jumped) {
          nextOffset = position + 1;
        }
        break;
      }
      // Compression pointer
      if ((length & 0xc0) === 0xc0) {
        const second = buffer[position + 1];
        const pointer = ((length & 0x3f) << 8) | second;
        if (!jumped) {
          nextOffset = position + 2;
        }
        position = pointer;
        jumped = true;
        continue;
      }
      // Normal label
      const label = buffer
        .subarray(position + 1, position + 1 + length)
        .toString("ascii");

      labels.push(label);
      position += length + 1;
    }

    return {
      name: labels.join("."),
      nextOffset,
    };
  }
  readQuestion() {
    const name = this.readName(this.buffer, this.offset);
    this.offset = name.nextOffset;
    const type = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    const cls = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return {
      name: name.name,
      type,
      class: cls,
    };
  }
  readAnswer() {
    const nameResult = this.readName(this.buffer, this.offset);
    this.log.debug(`decoding... ${nameResult.name}`);
    this.offset = nameResult.nextOffset;

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

    let ipStack = [];

    if (type === 1 && rdlength === 4) {
      for (let i = 0; i < 4; i++) {
        ipStack.push(this.buffer.readUInt8(this.offset + i));
      }
      this.offset += rdlength;
      return {
        name: nameResult.name,
        type,
        typeName: "A",
        className: CLASS_NAMES[cls] ?? `CLASS${cls}`,
        ttl,
        rdlength,
        ip: ipStack.join("."),
      };
    } else if (type === 28 && rdlength === 16) {
      for (let i = 0; i < 8; i++)
        ipStack.push(this.buffer.readUInt16BE(this.offset + i * 2));
      this.offset += rdlength;
      return {
        name: nameResult.name,
        type,
        typeName: "AAAA",
        className: CLASS_NAMES[cls] ?? `CLASS${cls}`,
        ttl,
        rdlength,
        ip: this.formatV6(ipStack),
      };
    } else if (type === 5) {
      const cname = this.readName(this.buffer, this.offset);
      this.offset += rdlength;
      return {
        name: nameResult.name,
        type,
        typeName: "CNAME",
        className: CLASS_NAMES[cls] ?? `CLASS${cls}`,
        ttl,
        rdlength,
        cname: cname.name,
      };
    }
    return null;
  }
  formatV6(groups) {
    const hexGroups = groups.map((group) => group.toString(16));

    let bestStart = -1;
    let bestLength = 0;

    let currentStart = -1;
    let currentLength = 0;

    for (let i = 0; i < 8; i++) {
      if (groups[i] === 0) {
        if (currentStart === -1) {
          currentStart = i;
          currentLength = 1;
        } else {
          currentLength++;
        }
      } else {
        if (currentLength > bestLength) {
          bestStart = currentStart;
          bestLength = currentLength;
        }
        currentStart = -1;
        currentLength = 0;
      }
    }

    if (currentLength > bestLength) {
      bestStart = currentStart;
      bestLength = currentLength;
    }
    if (bestLength >= 2) {
      const before = hexGroups.slice(0, bestStart).join(":");

      const after = hexGroups.slice(bestStart + bestLength).join(":");

      let ip;
      if (before && after) ip = `${before}::${after}`;
      else if (before) ip = `${before}::`;
      else if (after) ip = `::${after}`;
      else ip = "::";
      return ip;
    }
    return hexGroups.join(":");
  }
  logAnswer(header, answers) {
    this.log.space();
    this.log.out(`======= Response(ID: ${header.trxid}) ======`);
    this.log.out("  Status:  ", header.flags.rcodeName);
    this.log.out("  length:  ", this.buffer.length, "Bytes");
    this.log.out(
      "  Question:",
      header.question_count,
      `(${this.questions.map((q) => q.name).join(", ")})`,
    );
    this.log.out("  Answer:  ", header.answer_count);
    this.log.space();
    this.log.out("  Answers...");
    answers.map((answer, index) =>
      this.log.outmust(
        `  ${index + 1}) ${answer.name} ${answer.typeName} -> ${answer.ip ?? answer.cname} TTL=${answer.ttl}`
      )
    );
    this.log.space();
  }
  parse(buffer, trxMap) {
    this.buffer = buffer;
    this.date = Date.now()
    this.log.infov(`${this.date} received:`, buffer.length, "bytes");
    if (this.options.raw) {
      this.log.space();
      this.log.out("=== received(raw) ===");
      this.log.hexDump(buffer);
      this.log.space();
    }

    this.readHeader();

    const transaction = trxMap.get(this.header.trxid);
    if (!transaction) {
      this.log.error(`Unknown transaction ID: ${this.header.trxid}`);
      return;
    }
    clearTimeout(transaction.timeout);
    transaction.status = "responded";
    transaction.response = this

    this.log.debug(`
  Trxid:         ${this.header.trxid},
  Flags(raw):    ${this.header.rawFlags.toString(16)}
  Answer count:  ${this.header.answer_count}`);
    const fg = this.header.flags;

    this.log.infov(`flags(decoded):
  QR:            ${fg.qr}
  Opcode:        ${fg.opcode}
  Authoritative: ${Boolean(fg.aa)}
  Truncated:     ${Boolean(fg.tc)}
  RD:            ${Boolean(fg.rd)}
  RA:            ${Boolean(fg.ra)}
  Reserved:      ${fg.z}
  Rcode:         ${fg.rcodeName}`);

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
      this.log.warn(
        `No answer provided ${this.questions.map((q) => q.name).join(", ")}`,
      );
    else this.logAnswer(this.header, this.answers);
    transaction.status = "successful";
  }
}
