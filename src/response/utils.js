import { fail } from "../utils.js";

export class ResponseUtil {
    constructor(buffer) {
        this.buffer = buffer;
    }

    readA(start, end) {
        if (end - start !== 4) {
            fail(`Invalid A RDLENGTH: ${start - end}`);
        }
        const ip = [];
        for (let i = 0; i < 4; i++) {
            ip.push(this.buffer.readUInt8(start + i));
        }
        return {
            address: ip.join(".")
        };
    }
    readAAAA(start, end) {
        if (end - start !== 16) {
            fail(`Invalid AAAA RDLENGTH: ${start - end}`);
        }
        const groups = [];
        for (let i = 0; i < 8; i++) {
            groups.push(this.buffer.readUInt16BE(start + i * 2));
        }
        return {
            address: this.formatAAAA(groups)
        };
    }
    readCNAME(start, end) {
        const result = this.readName(this.buffer, start);

        if (result.nextOffset > end) {
            fail("CNAME RDATA exceeds RDLENGTH");
        }
        return {
            target: result.name
        };
    }

    readNS(start, end) {
        const result = this.readName(this.buffer, start);

        if (result.nextOffset > end) {
            fail("NS RDATA exceeds RDLENGTH");
        }
        return {
            nameserver: result.name
        };
    }

    readPTR(start, end) {
        const result = this.readName(this.buffer, start);

        if (result.nextOffset > end) {
            fail("PTR RDATA exceeds RDLENGTH");
        }
        return {
            target: result.name
        };
    }

    readMX(start, end) {
        if (end - start < 3) {
            fail("Invalid MX RDLENGTH");
        }
        const preference = this.buffer.readUInt16BE(start);
        const exchange = this.readName(this.buffer, start + 2);

        if (exchange.nextOffset > end) {
            fail("MX exchange exceeds RDLENGTH");
        }
        return {
            preference,
            exchange: exchange.name
        };
    }

    readTXT(start, end) {
        const strings = [];
        let offset = start;
        while (offset < end) {
            const length = this.buffer[offset];
            offset++;

            if (offset + length > end) {
                fail("Invalid TXT record");
            }
            const text = this.buffer
                .subarray(offset, offset + length)
                .toString("utf8");

            offset += length;

            strings.push(text);
        }

        return {
            strings
        };
    }
    readSRV(start, end) {
        let offset = start;

        const priority = this.buffer.readUInt16BE(offset);
        offset += 2;

        const weight = this.buffer.readUInt16BE(offset);
        offset += 2;

        const port = this.buffer.readUInt16BE(offset);
        offset += 2;

        const target = this.readName(this.buffer, offset);

        return {
            priority,
            weight,
            port,
            target: target.name
        };
    }

    readSOA(start, end) {
        let offset = start;
        const mname = this.readName(this.buffer, offset);
        offset = mname.nextOffset;
        const rname = this.readName(this.buffer, offset);
        offset = rname.nextOffset;
        const serial = this.buffer.readUInt32BE(offset);
        offset += 4;
        const refresh = this.buffer.readUInt32BE(offset);
        offset += 4;
        const retry = this.buffer.readUInt32BE(offset);
        offset += 4;
        const expire = this.buffer.readUInt32BE(offset);
        offset += 4;
        const minimum = this.buffer.readUInt32BE(offset);
        offset += 4;

        if (offset !== end) {
            fail("Invalid SOA RDLENGTH");
        }
        return {
            mname: mname.name,
            rname: rname.name,
            serial,
            refresh,
            retry,
            expire,
            minimum
        };
    }

    readUnknown(start, end) {
        const data = this.buffer.subarray(start, end);

        return {
            raw: data.toString("hex")
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
            nextOffset
        };
    }
    formatAAAA(groups) {
        const hexGroups = groups.map(group => group.toString(16));

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
    showHeaderInfo(header, log) {
        if (header.flags.rcode !== 0) {
            log.warn(`DNS server returned ${this.header.flags.rcodeName}`);
        }
        if (header.flags.tc === 1) {
            log.warn(`DNS response is Truncated try --tcp`);
        }
    }
}
