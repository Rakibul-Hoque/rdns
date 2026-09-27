export const CLI_EXAMPLES = [
    {
        command: "rdns google.com",
        description: "Standard DNS query"
    },

    {
        command: "rdns -t A,AAAA -H 1.1.1.1 google.com",
        description: "Query IPv4 and IPv6 using the 1.1.1.1 DNS server"
    },

    {
        command: "rdns google.com github.com example.com",
        description: "Query multiple domains"
    },

    {
        command: "rdns --all github.com",
        description: "Query all supported DNS record types"
    },

    {
        command: "rdns -r -T google.com",
        description: "Perform a DNS query over TCP with raw hex packet output"
    },

    {
        command: "rdns --json-export out.json github.com",
        description: "Save serialized JSON to a file"
    },

    {
        command: "rdns --all -v -T --json-export out.json github.com",
        description: "All record types with verbose TCP output and JSON export"
    },

    {
        command: "rdns --trace amazon.aws.com",
        description: "Recursively trace DNS resolution"
    },

    {
        command: "rdns --trace -t NS --hops 10 amazon.aws.com",
        description: "Trace NS records with a 10-hop limit"
    }
];

export const CLI_NOTES = [
    `# Switches can be placed anywhere in the command.
    The parser automatically detects options regardless of 
    their position.  
    E.g:
      rdns -t AAAA -H 1.1.1.1 google.com -v -r github.com --timeout 20`,
    "# Multiple domains can be supplied in a single command.",
    "# Record types can be supplied as a comma-separated list.",
    "# Trace mode accepts only one domain and one record type.",
    "# -T, --tcp is equivalent to --protocol tcp.",
    "# --no-color disables ANSI color output."
];

export const LIST_LIST = ["types", "classes"];
