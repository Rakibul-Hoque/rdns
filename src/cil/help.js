import { CLI_OPTIONS } from "./options.js";
import {
    CLI_EXAMPLES,
    CLI_NOTES,
   
} from "./helpStore.js";
import {
    
    VERSION_STRING,
    VERSION
} from "./version.js";

const getDefault = option => {
    if (option.default === undefined) {
        return null;
    }

    if (typeof option.default === "function") {
        return option.default();
    }
    return option.default;
};

const formatFlags = option => {
    let flags;
    if (option.flags.length === 1 && option.flags[0].startsWith("--"))
        flags = `    ${option.flags}`;
    else flags = option.flags.join(", ");

    if (option.valueName) {
        return `${flags} ${option.valueName}`;
    }
    return flags;
};

const formatOption = (option, width = 28) => {
    const left = formatFlags(option);

    let line = `  ${left.padEnd(width)}` + option.description;

    const defaultValue = getDefault(option);

    if (option.type !== "boolean") {
        if (defaultValue !== undefined && defaultValue !== null) {
            line += `\n  ${"".padEnd(width)}` + `default: ${defaultValue}`;
        }
    }
    if (option.note) {
        line += `\n  ${"".padEnd(width)}` + option.note;
    }
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
    return ["Note:", "", ...CLI_NOTES.map(note => `  ${note}\n`), ""].join(
        "\n"
    );
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
