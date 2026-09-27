import { TYPE_NAMES } from "./store.js";

export class Formatter {
    constructor(options, log) {
        this.options = options;
        this.log = log;
    }

    formatResponse(response) {
        const {
            header,
            questions,
            answers,
            authority = [],
            additional = []
        } = response;

        this.log.space();
        this.log.out(
            this.log.color(
                "cyan",
                `===== DNS Response (ID: ${header.trxid}) =====`
            )
        );

        if (this.log.verbose) {
            this.formatVerboseHeader(header, response);
            this.formatVerboseQuestions(questions);

            this.formatVerboseRecords("Answers", answers);

            if (authority.length > 0) {
                this.formatVerboseRecords("Authority", authority);
            }
            if (additional.length > 0) {
                this.formatVerboseRecords("Additional", additional);
            }
        } else {
            this.formatNormalHeader(header, response);

            this.formatNormalRecords("Answers", answers);

            if (authority.length > 0) {
                this.formatNormalRecords("Authority", authority);
            }

            if (additional.length > 0) {
                this.formatNormalRecords("Additional", additional);
            }
        }

        this.log.space();
    }

    formatNormalHeader(header, response) {
        const f = header.flags;

        const statusColor =
            f.rcode === 0 ? "green" : f.rcode === 3 ? "yellow" : "red";

        const headerStr = [
            "  Status:    " +
                `${this.log.color(statusColor, `${f.rcodeName} (${f.rcode})`)}`,

            "  Questions: " +
                `${this.log.color("yellow", header.question_count)}`,

            "  Answers:   " +
                `${this.log.color("yellow", header.answer_count)}`,

            "  Length:    " +
                `${this.log.color("yellow", response.buffer.length)} Bytes`
        ].join("\n");
        this.log.out(headerStr);
    }

    formatNormalRecords(title, records) {
        this.log.space();
        this.log.outmust(this.log.color("blue", `  ${title}:`));

        if (records.length === 0) {
            this.log.outmust(`  ${this.log.color("gray", "  <none>")}`);
            return;
        }
        records.forEach((record, index) => {
            this.log.outmust(
                `    ${this.log.color("yellow", `${index + 1})`)} ` +
                    this.formatNormalAnswer(record)
            );
        });
    }

    formatNormalAnswer(answer) {
        const { name, type, typeName, ttl, data } = answer;

        const coloredName = this.log.color("bold", name);
        const coloredType = this.log.color("cyan", typeName);
        const coloredTTL = this.log.color("gray", `TTL=${ttl}`);

        switch (type) {
            case 1: // A
            case 28: // AAAA
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("green", data.address)} ` +
                    `${coloredTTL}`
                );

            case 2: // NS
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", data.nameserver)} ` +
                    `${coloredTTL}`
                );

            case 5: // CNAME
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", data.target)} ` +
                    `${coloredTTL}`
                );

            case 6: // SOA
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", data.mname)} ` +
                    `${data.rname} ` +
                    `${this.log.color("yellow", `serial=${data.serial}`)} ` +
                    `${coloredTTL}`
                );

            case 12: // PTR
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", data.target)} ` +
                    `${coloredTTL}`
                );

            case 15: // MX
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", data.exchange)} ` +
                    `${this.log.color("yellow", `preference=${data.preference}`)} ` +
                    `${coloredTTL}`
                );

            case 16: // TXT
                return (
                    `${coloredName} ${coloredType} ` +
                    `${data.strings
                        .map(s => this.log.color("green", `"${s}"`))
                        .join(" ")} ` +
                    `${coloredTTL}`
                );

            case 33: // SRV
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("cyan", `${data.target}:${data.port}`)} ` +
                    `${this.log.color(
                        "yellow",
                        `priority=${data.priority}`
                    )} ` +
                    `${this.log.color("yellow", `weight=${data.weight}`)} ` +
                    `${coloredTTL}`
                );

            default:
                return (
                    `${coloredName} ${coloredType} ` +
                    `${this.log.color("gray", data?.raw ?? "<unknown>")} ` +
                    `${coloredTTL}`
                );
        }
    }

    formatVerboseHeader(header, response) {
        const f = header.flags;
        const rcodeColor =
            f.rcode === 0 ? "green" : f.rcode === 3 ? "yellow" : "red";
        this.log.space();
        const headerStr = [
            "  Transaction ID: " + this.log.color("yellow", header.trxid),

            "  Flags:          " +
                this.log.color("cyan", `0x${header.rawFlags}`),
            `  QR:             ${f.qr}`,
            `  Opcode:         ${f.opcode}`,

            "  Authoritative:  " +
                this.log.color(f.aa ? "green" : "gray", Boolean(f.aa)),

            "  Truncated:      " +
                this.log.color(f.tc ? "yellow" : "gray", Boolean(f.tc)),

            "  Recursion:      " + Boolean(f.rd),
            "  Recursion Avail:" + Boolean(f.ra),

            "  RCode:          " +
                this.log.color(rcodeColor, `${f.rcodeName} (${f.rcode})`),

            "  Questions:      " +
                this.log.color("yellow", header.question_count),

            "  Answers:        " +
                this.log.color("yellow", header.answer_count),

            "  Authority:      " +
                this.log.color("yellow", header.authority_count),

            "  Additional:     " +
                this.log.color("yellow", header.additional_count),

            "  Length:         " +
                this.log.color("yellow", response.buffer.length) +
                " Bytes"
        ].join("\n");

        this.log.out(headerStr);
    }

    formatVerboseQuestions(questions) {
        this.log.space();

        this.log.out(this.log.color("blue", "  Questions:"));

        if (questions.length === 0) {
            this.log.out(`    ${this.log.color("gray", "<none>")}`);
            return;
        }

        questions.forEach((question, index) => {
            this.log.out(
                `    ${this.log.color("yellow", `${index + 1})`)} ` +
                    `${this.log.color("bold", question.name)} ` +
                    `${this.log.color(
                        "cyan",
                        question.typeName ?? question.type
                    )} ` +
                    `${this.log.color(
                        "gray",
                        question.className ?? question.class
                    )}`
            );
        });
    }

    formatVerboseRecords(title, records) {
        this.log.space();

        this.log.out(this.log.color("blue", `  ${title}:`));

        if (records.length === 0) {
            this.log.out(`  ${this.log.color("gray", "<none>")}`);
            return;
        }
        records.forEach((record, index) => {
            this.log.out(
                `    ${this.log.color("yellow", `${title.slice(0, -1)} #${index + 1}`)}`
            );

            this.log.out(this.formatVerboseAnswer(record));
            if (records.length !== index + 1) this.log.space();
        });
    }

    formatVerboseAnswer(answer) {
        const {
            name,
            type,
            typeName,
            class: cls,
            className,
            ttl,
            rdlength,
            data
        } = answer;

        return [
            "       Name:      " + this.log.color("bold", name),

            "       Type:      " +
                this.log.color("cyan", `${typeName} (${type})`),

            "       Class:     " +
                this.log.color("gray", `${className} (${cls})`),

            "       TTL:       " + this.log.color("yellow", ttl),

            "       RDLENGTH:  " + this.log.color("yellow", rdlength),

            "       RDATA:     " + this.formatData(answer)
        ].join("\n");
    }

    formatData(answer) {
        const { type, data } = answer;

        switch (type) {
            case 1:
            case 28:
                return `Address: ${this.log.color("green", data.address)}`;

            case 2:
                return `Nameserver: ${this.log.color("cyan", data.nameserver)}`;

            case 5:
                return `Target: ${this.log.color("cyan", data.target)}`;

            case 6:
                return [
                    `MNAME: ${this.log.color("cyan", data.mname)}`,
                    `RNAME: ${this.log.color("cyan", data.rname)}`,
                    `Serial: ${this.log.color("yellow", data.serial)}`,
                    `Refresh: ${data.refresh}`,
                    `Retry: ${data.retry}`,
                    `Expire: ${data.expire}`,
                    `Minimum: ${data.minimum}`
                ].join(", ");

            case 12:
                return `Target: ${this.log.color("cyan", data.target)}`;

            case 15:
                return [
                    `Preference: ${this.log.color("yellow", data.preference)}`,
                    `Exchange: ${this.log.color("cyan", data.exchange)}`
                ].join(", ");

            case 16:
                return data.strings
                    .map(s => this.log.color("green", `"${s}"`))
                    .join(" ");

            case 33:
                return [
                    `Priority: ${this.log.color("yellow", data.priority)}`,
                    `Weight: ${this.log.color("yellow", data.weight)}`,
                    `Port: ${this.log.color("yellow", data.port)}`,
                    `Target: ${this.log.color("cyan", data.target)}`
                ].join(", ");

            default:
                return this.log.color("gray", data?.raw ?? "<unknown>");
        }
    }

    formatTrace(result) {
        this.log.space();

        this.log.out(this.log.color("cyan", "========== DNS TRACE =========="));

        this.log.out("  Target: " + this.log.color("bold", result.target));

        this.log.out("  Type:   " + this.log.color("cyan", result.typeName));

        this.log.out(
            "  Status: " +
                this.log.color(
                    result.status === "ANSWER"
                        ? "green"
                        : result.status === "NXDOMAIN" ||
                            result.status === "NODATA"
                          ? "yellow"
                          : "red",
                    result.status
                )
        );

        this.log.out("");

        for (const hop of result.trace) {
            this.formatTraceHop(hop);
        }

        this.log.out(
            this.log.color("blue", "========== TRACE RESULT ==========")
        );

        this.log.out(
            "  " +
                this.log.color(
                    result.status === "ANSWER"
                        ? "green"
                        : result.status === "NXDOMAIN" ||
                            result.status === "NODATA"
                          ? "yellow"
                          : "red",
                    result.message
                )
        );

        this.log.out("  Hops:    " + this.log.color("yellow", result.hops));

        this.log.out("  Queries: " + this.log.color("yellow", result.queries));

        this.log.space();
    }

    formatTraceHop(hop) {
        this.log.outmust(
            this.log.color(
                "blue",
                `[${hop.hop}] ${hop.server} ${hop.serverDomain ? `(${hop.serverDomain})` : ""}`
            )
        );
this.log.out("  HopKind: " + hop.traceKind);
        this.log.out(
            "  Query:   " +
                this.log.color("bold", hop.name) +
                " " +
                this.log.color("cyan", TYPE_NAMES[hop.type] ?? hop.type)
        );
        

        if (hop.error) {
            this.log.out("  Error:   " + this.log.color("red", hop.error));

            this.log.space();
            return;
        }

        const response = hop.response;

        if (!response) {
            this.log.out("  " + this.log.color("gray", "No response"));

            this.log.space();
            return;
        }

        const { header, answers, authority, additional } = response;

        const f = header.flags;

        this.log.out(
            "  RCode:   " +
                this.log.color(
                    f.rcode === 0 ? "green" : f.rcode === 3 ? "yellow" : "red",
                    f.rcodeName
                )
        );

        if (this.log.verbose) {
            if (answers.length > 0)
                this.formatVerboseRecords("Answers", answers);

            if (authority.length > 0)
                this.formatVerboseRecords("Authority", authority);

            if (additional.length > 0)
                this.formatVerboseRecords("Additional", additional);
        } else {
            if (answers.length > 0)
                this.formatNormalRecords("Answers", answers);

            if (authority.length > 0)
                this.formatNormalRecords("Authority", authority);

            if (additional.length > 0)
                this.formatNormalRecords("Additional", additional);
        }
        this.log.space();
    }

    hexDump(buffer, headerTxt) {
        if (!this.options.raw) return;
        this.log.space();
        this.log.out(headerTxt);
        for (let offset = 0; offset < buffer.length; offset += 16) {
            const chunk = buffer.subarray(offset, offset + 16);

            const hex = [...chunk]
                .map(byte => byte.toString(16).padStart(2, "0"))
                .join(" ");
            this.log.out(
                offset.toString(16).padStart(4, "0"),
                this.log.color("cyan", hex)
            );
        }
        this.log.space();
    }
}
