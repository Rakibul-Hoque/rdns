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
    A: 1,
    NS: 2,
    CNAME: 5,
    SOA: 6,
    PTR: 12,
    MX: 15,
    TXT: 16,
    AAAA: 28,
    SRV: 33
    /* NAPTR: 35,
    DNAME: 39,
    OPT: 41,
    DS: 43,
    RRSIG: 46,
    NSEC: 47,
    DNSKEY: 48,
    SVCB: 64,
    HTTPS: 65 */
};

export const ALL_TYPES = Object.keys(TYPES).join(",");

export const TYPE_NAMES = Object.fromEntries(
    Object.entries(TYPES).map(([name, code]) => [code, name])
);

export const CLASSES = {
    IN: 1,
    CH: 3,
    HS: 4
}; 

export const ALL_CLASSES  = Object.keys(CLASSES).join(",");


export const CLASS_NAMES = Object.fromEntries(
    Object.entries(CLASSES).map(([name, code]) => [code, name])
);



export const ROOT_SERVERS = [
    "198.41.0.4",
    "170.247.170.2",
    "192.33.4.12",
    "199.7.91.13",
    "192.203.230.10",
    "192.5.5.241",
    "192.112.36.4",
    "198.97.190.53",
    "192.36.148.17",
    "192.58.128.30",
    "193.0.14.129",
    "199.7.83.42",
    "202.12.27.33"
];

export const RCODE_NAMES = {
    0: "NOERROR",
    1: "FORMERR",
    2: "SERVFAIL",
    3: "NXDOMAIN",
    4: "NOTIMP",
    5: "REFUSED"
};
