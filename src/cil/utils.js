import { CLI_OPTIONS } from "./options.js";
import { logError } from "../utils.js";


export function cliFail(message) {
    logError(message);
    process.exit(2);
}

export const createFlagMap = () => {
    const map = new Map();
    for (const section of Object.values(CLI_OPTIONS)) {
        for (const option of section) {
            for (const flag of option.flags) {
                map.set(flag, option);
            }
        }
    }
    return map;
};

export const createDefaults = () => {
    const defaults = {
        domains: []
    };
    for (const section of Object.values(CLI_OPTIONS)) {
        for (const option of section) {
            if (option.default !== undefined) {
                defaults[option.key] = option.default;
            }
        }
    }
    return defaults;
};

export const DEFAULT = createDefaults();
