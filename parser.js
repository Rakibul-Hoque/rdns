import { TYPES, CLASSES } from "./store.js";
import { cliFail } from "./utils.js";

export class Parser {
    constructor(options) {
        this.options = options;
    }
    err(msg) {
        console.log("[ERROR]", msg);
        process.exitCode = 2;
    }

    requireValue(pointer, option) {
        const value = this.args[1 + pointer];
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
            this.options.help = true;
            return this.options;
        }
        this.args = args;

        for (let pointer = 0; pointer < args.length; pointer++) {
            const arg = args[pointer];

            switch (arg) {
                case "-v":
                case "--verbose":
                    this.options.verbose = true;
                    break;
                case "-r":
                case "--raw":
                    this.options.raw = true;
                    break;
                case "--silent":
                case "--quiet":
                    this.options.silent = true;
                    break;
                case "--batch":
                    this.options.batch = true;
                    break;
                case "--debug":
                    this.options.debug = true;
                    break;
                case "--no-color":
                    this.options.color = false;
                    break;
                case "--json":
                    this.options.json = true;
                    break;
                case "--help":
                    this.options.help = true;
                    break;
                case "--version":
                    this.options.version = true;
                    break;
                case "-t":
                case "--type":
                    this.options.type = this.requireValue(
                        pointer,
                        "-t/--type [value]"
                    );
                    pointer++;
                    break;
                case "-p":
                case "--port":
                    this.options.port = this.requireValue(
                        pointer,
                        "-p/--port [number]"
                    );
                    pointer++;
                    break;
                case "-h":
                case "--host":
                    this.options.host = this.requireValue(
                        pointer,
                        "-h/--host [x.x.x.x]"
                    );
                    pointer++;
                    break;
                case "--json-export":
                    this.options.json_export = this.requireValue(
                        pointer,
                        "--json-export [file]"
                    );
                    this.options.json = true;
                    pointer++;
                    break;
                case "--protocol":
                    this.options.protocol = this.requireValue(
                        pointer,
                        "--protocol [tcp/udp]"
                    );
                    pointer++;
                    break;
                case "--timeout":
                    this.options.timeout = this.requireValue(
                        pointer,
                        "--timeout [seconds]"
                    );
                    pointer++;
                    break;
                default:
                    if (arg.startsWith("-")) {
                        cliFail(`Unknown option ${arg}`);
                    }
                    this.options.domains.push(arg);
                    break;
            }
        }
        return this.options;
    }

    validate(options, log) {
        if (options.verbose && options.silent) {
            cliFail(
                "-v/--verbose and --silent/--quiet cannot be used togethere"
            );
        }

        const type = TYPES[options.type.toUpperCase()];
        if (!type) {
            cliFail(
                `Invalid type: ${type} \n Supported types: ${Object.keys(TYPES).join(", ")}`
            );
        }
        options.type = type;
        const cls = CLASSES[options.class.toUpperCase()];
        if (!cls) {
            cliFail(
                `Invalid class: ${cls} \n Supported classes: ${Object.keys(CLASSES).join(", ")}`
            );
        }
        options.class = cls;

        options.protocol = options.protocol.toLowerCase();
        if (options.protocol !== "tcp" && options.protocol !== "udp")
            cliFail(`Invalid protocol: ${options.protocol} please tcp or udp`);

        let port = this.ensureNumber(
            options.port,
            "-p/--port [number] , must be a number between 0-65536"
        );
        if (port < 1 || port > 65535) {
            log.error("-p/--port [number] , must be a number between 0-65536");
            port = 53;
        }
        options.port = port;

        log.infov(
            "Using String:", log.color("bold", `${options.protocol}://${options.host}:${options.port}`)
        );

        options.timeout =
            this.ensureNumber(
                options.timeout,
                "--timeout [number] , must be a number"
            ) * 1000;

        if (options.domains.length === 0) cliFail("No domain provided");
        return options;
    }
}
