import { Parser } from "./cil/parser.js";
import { buildQuickHelp, buildHelp } from "./cil/help.js";
import { VERSION_STRING } from "./cil/version.js";
import { Logger } from "./logger.js";
import { Formatter } from "./formatter.js";
import { NormalController } from "./controller/normalController.js";
import { TraceController } from "./controller/traceController.js";
import { fail, setConf } from "./utils.js";

function checkIfAskedInfo(options) {
    if (options.help) {
        console.log(buildHelp());
        return true;
    }
    if (options.quickHelp) {
        console.log(buildQuickHelp());
        return true;
    }
    if (options.version) {
        console.log(VERSION_STRING);
        return true;
    }
    return false;
}

export async function main() {
    const parser = new Parser();

    const receivedOptions = parser.parse(process.argv.slice(2));

    if (checkIfAskedInfo(receivedOptions)) {
        return;
    }

    setConf(receivedOptions);

    const log = new Logger(receivedOptions);

    const options = parser.validate(receivedOptions, log);

    const format = new Formatter(options, log);

    const Controller = options.trace ? TraceController : NormalController;

    const controller = new Controller(options, log, format);

    await controller.start();
}
