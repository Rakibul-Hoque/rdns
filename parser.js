import { IP_TYPES } from "./store.js";
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
      if (args[pointer] === "-v" || args[pointer] === "--verbose") {
        this.options.verbose = true;
      } else if (args[pointer] === "-r" || args[pointer] === "--raw") {
        this.options.raw = true;
      } else if (args[pointer] === "--silent" || args[pointer] === "--quiet") {
        this.options.silent = true;
      } else if (args[pointer] === "--batch") {
        this.options.batch = true;
      } else if (args[pointer] === "--debug") {
        this.options.debug = true;
      } else if (args[pointer] === "--no-color") {
        this.options.color = false;
      } else if (args[pointer] === "--json") {
        this.options.json = true
      } else if (args[pointer] === "--help") {
        this.options.help = true;
      } else if (args[pointer] === "--version") {
        this.options.version = true;
      } else if (args[pointer] === "-t" || args[pointer] === "--type") {
        this.options.ip_type = this.requireValue(pointer, "-t/--type [value]");
        pointer++;
      } else if (args[pointer] === "-p" || args[pointer] === "--port") {
        this.options.port = this.requireValue(pointer, "-p/--port [number]");
        pointer++;
      } else if (args[pointer] === "-h" || args[pointer] === "--host") {
        this.options.host = this.requireValue(pointer, "-h/--host [x.x.x.x]");
        pointer++;
      } else if (args[pointer] === "--json-export") {
        this.options.json_export = this.requireValue(
          pointer,
          "--json-export [file]",
        );
        this.options.json = true
        pointer++;
      } else if (args[pointer] === "--timeout") {
        this.options.timeout = this.requireValue(
          pointer,
          "--timeout [seconds]",
        );
        pointer++;
      } else if (args[pointer].startsWith("-")) {
        cliFail(`Unknown option ${args[pointer]}`);
      } else {
        this.options.domains.push(args[pointer]);
      }
    }
    return this.options;
  }

  validate(options, log) {
    if (options.verbose && options.silent) {
      cliFail("-v/--verbose and --silent/--quiet cannot be used togethere");
    }

    const ip_type = IP_TYPES[options.ip_type.toUpperCase()];
    if (!ip_type) {
      cliFail(
        `Invalid type: ${ip_type} \n Supported types: ${Object.keys(IP_TYPES).join(", ")}`,
      );
    }
    options.ip_type = ip_type;

    let port = this.ensureNumber(
      options.port,
      "-p/--port [number] , must be a number between 0-65536",
    );
    if (port < 1 || port > 65535) {
      log.error("-p/--port [number] , must be a number between 0-65536");
      port = 53;
    }

    log.infov(`Using UDP port ${port}`);
    options.port = port;
    log.infov(`Using host ${options.host}`);

    options.timeout =
      this.ensureNumber(
        options.timeout,
        "--timeout [number] , must be a number",
      ) * 1000;

    if (options.domains.length === 0) cliFail("No domain provided");
    return options;
  }
}
