import { Parser } from "./cli/parser.js";
import { Logger } from "./logger.js";
import { Formatter } from "./formatter.js";
import { NormalController } from "./controller/normalController.js";
import { TraceController } from "./controller/traceController.js";
import { setConf } from "./utils.js";
import { checkIfAskedInfo } from "./cli/helps.js";

export async function main() {
    const parser = new Parser();

    const receivedOptions = parser.parse(process.argv.slice(2));

    setConf(receivedOptions);

    const log = new Logger(receivedOptions);

    const options = parser.validate(receivedOptions, log);

    if (checkIfAskedInfo(options)) {
        return;
    }
    const format = new Formatter(options, log);

    const Controller = options.trace ? TraceController : NormalController;

    const controller = new Controller(options, log, format);

    await controller.start();
}
