import { CLI_OPTIONS } from "./options.js";
import { CLI_EXAMPLES, CLI_NOTES, LIST_LIST } from "./store.js";
import { VERSION_STRING, VERSION } from "./version.js";
import { TYPES, CLASSES } from "../store.js";

const getDefault = option => {
    if (option.default === undefined) return null;
    if (typeof option.default === "function") return option.default();
    return option.default;
};

const formatFlags = option => {
    let flags;
    if (option.flags.length === 1 && option.flags[0].startsWith("--"))
        flags = `    ${option.flags}`;
    else flags = option.flags.join(", ");

    if (option.valueName) return `${flags} ${option.valueName}`;

    return flags;
};

const formatOption = (option, width = 28) => {
    const left = formatFlags(option);

    let line = `  ${left.padEnd(width)}` + option.description;

    const defaultValue = getDefault(option);

    if (option.extra) line += `\n  ${"".padEnd(width)}` + option.extra;

    if (
        option.type !== "boolean" &&
        defaultValue !== undefined &&
        defaultValue !== null
    )
        line += `\n  ${"".padEnd(width)}` + `default: ${defaultValue}`;

    line += "\n";

    return line;
};

const renderOptionSection = (title, options) => {
    return [
        `${title}:`,
        "",
        ...options.map(option => formatOption(option)),
        ""
    ].join("\n");
};

const renderExamples = () => {
    return [
        "Examples:",
        "",
        ...CLI_EXAMPLES.flatMap(example => [
            `  ${example.command}`,
            `      -> ${example.description}`,
            ""
        ])
    ].join("\n");
};

const renderNotes = () => {
    return ["Note:", "", ...CLI_NOTES.map(note => `  ${note}`), ""].join("\n");
};

export const buildQuickHelp = () => {
    const quick = [
        ...CLI_OPTIONS.query,
        ...CLI_OPTIONS.output,
        ...CLI_OPTIONS.general
    ];

    return [
        `RDNS: DNS Query Tool, version: ${VERSION}`,
        "",
        "Usage:",
        "  rdns [options] <domain...>",
        "",
        "Options:",
        "",
        ...quick.map(
            option => `  ${formatFlags(option).padEnd(26)}` + option.description
        ),
        "",
        "Use --help for detailed help."
    ].join("\n");
};

export const buildHelp = () => {
    return [
        "RDNS: DNS Query Tool",
        "",
        `Version: ${VERSION_STRING}`,
        "",
        "Usage:",
        "  rdns [options] <domain...>",
        "",
        "",
        renderOptionSection("Options", CLI_OPTIONS.query),
        renderOptionSection("Output", CLI_OPTIONS.output),
        renderOptionSection("General", CLI_OPTIONS.general),
        renderExamples(),
        renderNotes()
    ].join("\n");
};

export const list = thing => {
    if (thing === "types") {
        return Object.keys(TYPES)
            .map(
                (type, i) => `${`   ${i})  ${type}`.padEnd(15)} ${TYPES[type]}`
            )
            .join("\n");
    } else if (thing === "classes") {
        return Object.keys(CLASSES)
            .map((cls, i) => `${`   ${i})  ${cls}`.padEnd(15)} ${CLASSES[cls]}`)
            .join("\n");
    }
};

export function checkIfAskedInfo(options) {
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
    if (options.list) {
        console.log(list(options.list));
        return true;
    }
    return false;
}
