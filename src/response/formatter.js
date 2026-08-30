export class ResponseFormatter {
    constructor(log) {
        this.log = log;
    }

    format(response) {
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

            // Only show when records exist
            if (authority.length > 0) {
                this.formatVerboseRecords("Authority", authority);
            }

            if (additional.length > 0) {
                this.formatVerboseRecords("Additional", additional);
            }
        } else {
            this.formatNormalHeader(header, response);
            this.formatNormalRecords("Answers", answers);

            // Only show when records exist
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

        this.log.out(
            "  Status:    " +
                `${this.log.color(statusColor, `${f.rcodeName} (${f.rcode})`)}`
        );

        this.log.out(
            "  Questions: " +
                `${this.log.color("yellow", header.question_count)}`
        );

        this.log.out(
            "  Answers:   " + `${this.log.color("yellow", header.answer_count)}`
        );

        this.log.out(
            "  Length:    " +
                `${this.log.color("yellow", response.buffer.length)} Bytes`
        );
    }

    formatNormalRecords(title, records) {
        this.log.space();
        this.log.outmust(this.log.color("blue", `${title}:`));

        if (records.length === 0) {
            this.log.outmust(`  ${this.log.color("gray", "<none>")}`);
            return;
        }
        records.forEach((record, index) => {
            this.log.outmust(
                `  ${this.log.color("yellow", `${index + 1})`)} ` +
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

        this.log.out("");
        this.log.out(
            "  Transaction ID: " + this.log.color("yellow", header.trxid)
        );
        this.log.out(
            "  Flags:          " +
                this.log.color("cyan", `0x${header.rawFlags}`)
        );
        this.log.out(`  QR:             ${f.qr}`);
        this.log.out(`  Opcode:         ${f.opcode}`);

        this.log.out(
            "  Authoritative:  " +
                this.log.color(f.aa ? "green" : "gray", Boolean(f.aa))
        );

        this.log.out(
            "  Truncated:      " +
                this.log.color(f.tc ? "yellow" : "gray", Boolean(f.tc))
        );

        this.log.out("  Recursion:      " + Boolean(f.rd));
        this.log.out("  Recursion Avail:" + Boolean(f.ra));

        const rcodeColor =
            f.rcode === 0 ? "green" : f.rcode === 3 ? "yellow" : "red";

        this.log.out(
            "  RCode:          " +
                this.log.color(rcodeColor, `${f.rcodeName} (${f.rcode})`)
        );

        this.log.out(
            "  Questions:      " +
                this.log.color("yellow", header.question_count)
        );

        this.log.out(
            "  Answers:        " + this.log.color("yellow", header.answer_count)
        );

        this.log.out(
            "  Authority:      " +
                this.log.color("yellow", header.authority_count)
        );

        this.log.out(
            "  Additional:     " +
                this.log.color("yellow", header.additional_count)
        );

        this.log.out(
            "  Length:         " +
                this.log.color("yellow", response.buffer.length) +
                " Bytes"
        );
    }

    formatVerboseQuestions(questions) {
        this.log.space();

        this.log.out(this.log.color("blue", "Questions:"));

        if (questions.length === 0) {
            this.log.out(`  ${this.log.color("gray", "<none>")}`);
            return;
        }

        questions.forEach((question, index) => {
            this.log.out(
                `  ${this.log.color("yellow", `${index + 1})`)} ` +
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

        this.log.out(this.log.color("blue", `${title}:`));

        if (records.length === 0) {
            this.log.out(`  ${this.log.color("gray", "<none>")}`);
            return;
        }
        records.forEach((record, index) => {
            this.log.out(
                `\n  ${this.log.color("yellow", `${title.slice(0, -1)} #${index + 1}`)}`
            );

            this.formatVerboseAnswer(record);
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

        this.log.out("     Name:      " + this.log.color("bold", name));

        this.log.out(
            "     Type:      " + this.log.color("cyan", `${typeName} (${type})`)
        );

        this.log.out(
            "     Class:     " + this.log.color("gray", `${className} (${cls})`)
        );

        this.log.out("     TTL:       " + this.log.color("yellow", ttl));

        this.log.out("     RDLENGTH:  " + this.log.color("yellow", rdlength));

        this.log.out("     RDATA:     " + this.formatData(answer));
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
}
