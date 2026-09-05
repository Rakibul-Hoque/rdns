import { TYPES, CLASSES, ALL_TYPES, TYPE_NAMES } from "../store.js";

import { createFlagMap, createDefaults, DEFAULT } from "./utils.js";

import { cliFail } from "./utils.js";

export class Parser {
    constructor(options = createDefaults()) {
        this.options = options;
        this.CLI_FLAG_MAP = createFlagMap();
    }

    requireValue(args, pointer, option) {
        const value = args[pointer + 1];

        if (value === undefined || value.startsWith("-")) {
            cliFail(`${option}, require a value`);
        }

        return value;
    }

    ensureNumber(value, message) {
        const num = Number(value);

        if (!Number.isInteger(num)) {
            cliFail(message);
        }

        return num;
    }

    parse(args) {
        if (args.length === 0) {
            this.options.quickHelp = true;
            return this.options;
        }

        for (let pointer = 0; pointer < args.length; pointer++) {
            const arg = args[pointer];

            const option = this.CLI_FLAG_MAP.get(arg);

            // Not an option => domain
            if (!option) {
                if (arg.startsWith("-")) {
                    cliFail(`Unknown option ${arg}`);
                }

                this.options.domains.push(arg);
                continue;
            }

            // Boolean option
            if (option.type === "boolean") {
                if (option.set !== undefined) {
                    this.options[option.key] = option.set;
                } else {
                    this.options[option.key] = true;
                }

                continue;
            }

            // Option requires a value
            const value = this.requireValue(
                args,
                pointer,
                `${option.flags.join("/")} ${option.valueName}`
            );

            this.options[option.key] = value;

            pointer++;
        }

        return this.options;
    }

    validate(options, log) {
        if (options.verbose && options.silent) {
            cliFail(
                "-v/--verbose and -q/--quiet/--silent cannot be used together"
            );
        }

        if (options.allType) {
            options.types = ALL_TYPES;
        }

        const types = options.types
            .split(",")
            .map(v => v.trim().toUpperCase())
            .filter(Boolean);

        options.types = types.map(typeName => {
            const type = TYPES[typeName];

            if (!type) {
                cliFail(
                    `Invalid type: ${typeName}\n` +
                        `Supported types: ${Object.keys(TYPES).join(", ")}`
                );
            }

            return type;
        });

        const cls = CLASSES[options.class.toUpperCase()];

        if (!cls) {
            cliFail(
                `Invalid class: ${options.class}\n` +
                    `Supported classes: ${Object.keys(CLASSES).join(", ")}`
            );
        }

        options.class = cls;

        options.protocol = options.protocol.toLowerCase();

        if (options.protocol !== "tcp" && options.protocol !== "udp") {
            cliFail(
                `Invalid protocol: ${options.protocol}, ` +
                    `please use tcp or udp`
            );
        }

        let port = this.ensureNumber(
            options.port,
            "-p/--port [number], must be a number between 1-65535"
        );

        if (port < 1 || port > 65535) {
            log.error("-p/--port [number], must be a number between 1-65535");

            port = 53;
        }

        options.port = port;

        log.infov(
            "Using String:",
            log.color(
                "bold",
                `${options.protocol}://${options.host}:${options.port}`
            )
        );

        options.timeout =
            this.ensureNumber(
                options.timeout,
                "--timeout [number], must be a number"
            ) * 1000;

        if (options.domains.length === 0) {
            cliFail("No domain provided");
        }

        this.validateTrace(options);

        return options;
    }

    validateTrace(options) {
        if (!options.trace) {
            if (options.traceMaxHops !== 20) {
                cliFail("--hops is only used in trace mode");
            }

            if (options.traceMaxQueries !== 50) {
                cliFail("--queries is only used in trace mode");
            }

            return options;
        }

        if (options.traceMaxHops !== DEFAULT.traceMaxHops)
            options.traceMaxHops = this.ensureNumber(
                options.traceMaxHops,
                "--hops [number] , must be a number"
            );
        if (options.traceMaxQueries !== DEFAULT.traceMaxQueries)
            options.traceMaxQueries = this.ensureNumber(
                options.traceMax,
                "--queries [number] , must be a number"
            );

        if (options.domains.length > 1) {
            cliFail(
                "Trace mode requires only one domain: " +
                    options.domains.join(", ")
            );
        }

        if (options.types.length > 1) {
            cliFail(
                "Trace mode needs only one type: " +
                    options.types.map(type => TYPE_NAMES[type]).join(", ")
            );
        }

        return options;
    }
}
