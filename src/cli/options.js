export const CLI_OPTIONS = {
    query: [
        {
            key: "types",
            flags: ["-t", "--type"],
            type: "value",
            valueName: "<type>",
            description: "DNS record type(s)",
            default: "A"
        },

        {
            key: "host",
            flags: ["-H", "--host"],
            type: "value",
            valueName: "<host>",
            description: "DNS server",
            default: "1.1.1.1"
        },

        {
            key: "port",
            flags: ["-p", "--port"],
            type: "value",
            valueName: "<port>",
            description: "DNS port",
            default: 53
        },

        {
            key: "timeout",
            flags: ["--timeout"],
            type: "value",
            valueName: "<sec>",
            description: "Request timeout",
            default: 60
        },

        {
            key: "protocol",
            flags: ["--protocol"],
            type: "value",
            valueName: "<tcp/udp>",
            description: "Transmission protocol",
            default: "udp"
        },
        {
            key: "class",
            flags: ["--class"],
            type: "value",
            valueName: "<class>",
            description: "DNS record class",
            default: "IN"
        },

        {
            key: "allType",
            flags: ["--all"],
            type: "boolean",
            description: "Send requests for all record types",
            extra: "Like: -t A,AAAA,NS,CNAME,PTR,...",
            default: false
        },

        {
            key: "batch",
            flags: ["--batch"],
            type: "boolean",
            description: "Send all domains in one DNS packet",
            default: false
        },

        {
            key: "protocol",
            flags: ["-T", "--tcp"],
            type: "boolean",
            description: "Perform DNS query over TCP",
            set: "tcp"
        },

        {
            key: "trace",
            flags: ["--trace"],
            type: "boolean",
            description: "Enable trace mode",
            default: false
        },

        {
            key: "traceMaxHops",
            flags: ["--hops"],
            type: "value",
            valueName: "<number>",
            description: "Maximum hops, used in trace mode",
            default: 20
        },

        {
            key: "traceMaxQueries",
            flags: ["--queries"],
            type: "value",
            valueName: "<number>",
            description: "Maximum queries, used in trace mode",
            default: 50
        }
    ],

    output: [
        {
            key: "verbose",
            flags: ["-v", "--verbose"],
            type: "boolean",
            description: "Verbose output",
            default: false
        },

        {
            key: "debug",
            flags: ["--debug"],
            type: "boolean",
            description: "Debug output",
            default: false
        },

        {
            key: "raw",
            flags: ["-r", "--raw"],
            type: "boolean",
            description: "Hex dump packets",
            default: false
        },

        {
            key: "silent",
            flags: ["-q", "--quiet", "--silent"],
            type: "boolean",
            description: "Minimal output",
            default: false
        },

        {
            key: "color",
            flags: ["--no-color"],
            type: "boolean",
            description: "Disable ANSI colors",
            default: true,
            set: false
        },

        {
            key: "json",
            flags: ["--json"],
            type: "boolean",
            description: "Dump serialized JSON to stdout",
            default: false
        },

        {
            key: "json_export",
            flags: ["--json-export"],
            type: "value",
            valueName: "<file>",
            description: "Save serialized JSON to a file"
        }
    ],

    general: [
        {
            key: "quickHelp",
            flags: ["-h", "--quickhelp"],
            type: "boolean",
            description: "Show quick help",
            default: false
        },
        {
            key: "help",
            flags: ["--help"],
            type: "boolean",
            description: "Show full help",
            default: false
        },
        {
            key: "version",
            flags: ["--version"],
            type: "boolean",
            description: "Show version",
            default: false
        },
        {
            key: "list",
            flags: ["--list"],
            type: "value",
            valueName: "<item>",
            description: "Show list of supported types or classes",
            extra: "E.g. --list types"
        }
    ]
};
