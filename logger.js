import { COLORS } from "./store.js";

export class Logger {
  verbose = false;
  silent = false;
  isDebug = false;
  isColor = true;

  constructor(config) {
    this.verbose = config.verbose;
    this.silent = config.silent;
    this.isDebug = config.debug;
    this.isColor = config.color;
  }

  color(name, text) {
    if (!this.isColor) return text;

    return `${COLORS[name] ?? ""}${text}${COLORS.reset}`;
  }
  info(...args) {
    if (!this.silent) {
      console.log(this.color("cyan", "[INFO]"), ...args);
    }
  }
  infov(...args) {
    if (this.verbose && !this.silent) {
      console.log(this.color("cyan", "[INFO]"), ...args);
    }
  }

  debug(...args) {
    if (this.isDebug) {
      console.log(this.color("gray", "[DEBUG]"), ...args);
    }
  }

  warn(...args) {
    console.warn(this.color("yellow", "[WARN]"), ...args);
  }

  error(...args) {
    console.error(this.color("red", "[ERROR]"), ...args);
  }

  out(...args) {
    if (!this.silent) console.log(...args);
  }
  outmust(...args) {
    console.log(...args);
  }


  space() {
    console.log("");
  }

  hexDump(buffer) {
    for (let offset = 0; offset < buffer.length; offset += 16) {
      const chunk = buffer.subarray(offset, offset + 16);

      const hex = [...chunk]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
      console.log(
        offset.toString(16).padStart(4, "0"),
        this.color("cyan", hex),
      );
    }
  }
}
