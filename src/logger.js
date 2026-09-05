import { COLORS } from "./store.js";

export class Logger {
    
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
}
