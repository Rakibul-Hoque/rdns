export const COLORS = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    gray: "\x1b[90m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    blue: "\x1b[34m"
};

export const TYPES = {
    A: 1,NS:2,
    CNAME: 5,
    PTR: 12,
    MX: 15,
    TXT: 16,
    AAAA: 28,
    SOA: 6,
    SRV: 33
};
export const TYPE_NAMES = {
    1: "A",
    2: "NS",
    5: "CNAME",
    12: "PTR",
    15: "MX",
    16: "TXT",
    28: "AAAA",
    6: "SOA",
    33: "SRV"
    /* 35: "NAPTR",
  39: "DNAME",
  41: "OPT",
  43: "DS",
  46: "RRSIG",
  47: "NSEC",
  48: "DNSKEY",
  64: "SVCB",
  65: "HTTPS", */
};
export const RCODE_NAMES = {
    0: "NOERROR",
    1: "FORMERR",
    2: "SERVFAIL",
    3: "NXDOMAIN",
    4: "NOTIMP",
    5: "REFUSED"
};
export const CLASS_NAMES = {
    1: "IN",
    3: "CH",
    4: "HS"
};

export const options = {
    type: "A",
    ip_class: 1,
    port: 53,
    host: "1.1.1.1",
    timeout: 60,
    raw: false,
    batch: false,
    verbose: false,
    silent: false,
    debug: false,
    color: true,
    help: false,
    json: false,
    json_export: "",
    version: false,
    domains: []
};
export const version = `rdns version 1.0.0`;
export const manual = `
  RDNS: DNS Query Tool

  Usage:
    rdns [options] <domain...>

  Options:

    -t, --type <type>       DNS record type
                          
    -h, --host <host>       DNS server
                            default: 8.8.8.8

    -p, --port <port>       UDP port
                            default: 53

        --timeout <sec>     Request timeout
                            default: 60

        --batch             Send all domains in one DNS packet

    -v, --verbose           Verbose output
        --debug             Debug output
    -r, --raw               Hex dump packets
        --quiet             Minimal output
        --no-color          Disable ANSI colors
        --json              Log serialized json
        --json-export <file> Save json 

        --help              Show this help
        --version           Show version 
  Example:
    rdns google.com                            -> Standard query
    rdns -t AAAA -h 1.1.1.1 google.com         -> IPv6 query to 1.1.1.1 dns server
    rdns -r google.com github.com example.com  -> Multiple query with hex output
  Note:
    switches can be randomly placed the parser will automaticly detect them 
    e.g. rdns -t AAAA -h 1.1.1.1 google.com -v -r github.com --timeout 20
`;
