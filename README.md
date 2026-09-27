RDNS

RDNS is a simple and lightweight DNS query tool built with JavaScript. It runs on Node.js or Bun, supports multiple DNS record types, custom DNS servers, TCP/UDP transport, batch queries, raw packet output, JSON export, and DNS trace mode.

---

Features

· Query DNS records for one or multiple domains in a single command
· Support for all common record types (A, AAAA, NS, CNAME, PTR, MX, TXT, and more)
· Custom DNS server and port selection
· UDP and TCP transport protocols
· DNS trace mode (recursive resolution) with configurable hop and query limits
· Batch queries – send multiple domains in one DNS packet
· Raw DNS packet hex dump for debugging
· Verbose, debug, and quiet output modes
· JSON output to stdout or file export
· ANSI color support (optional disable)
· Runs with Node.js or Bun
· Standalone precompiled binaries for Linux (x64/arm64) and Windows (x64)

---

Requirements

To run RDNS from source, you need either:

· Node.js (version 14 or later recommended)
· Bun (if you prefer Bun runtime)

If you use a precompiled binary, no runtime is required.

---

Installation

Option 1: Precompiled Binaries (Recommended)

Download the appropriate release for your platform from the Releases page.

File Platform / Purpose
rdns-v1.0.0-linux-x64.zip Linux 64-bit executable
rdns-v1.0.0-linux-arm64.zip Linux ARM64 executable
rdns-v1.0.0-windows-x64.zip Windows 64-bit executable
rdns-v1.0.0-js.zip Source code (JavaScript)

Extract the archive and run the binary directly.
On Linux/macOS you may need to make it executable:

```bash
chmod +x rdns
./rdns google.com
```

On Windows, simply run rdns.exe google.com.

Option 2: From Source

Clone the repository:

```bash
git clone https://github.com/Rakibul-Hoque/rdns.git
cd rdns
```

No additional dependencies are needed for running the source directly.

Run with Node.js

```bash
node src/index.js google.com
```

Run with Bun

```bash
bun src/index.js google.com
```

---

Usage

```text
rdns [options] <domain...>
```

Basic Query

```bash
rdns google.com
```

Performs a standard DNS query for the A record.

Query Specific Record Types

```bash
rdns -t A,AAAA google.com
```

Query both IPv4 (A) and IPv6 (AAAA) records.

Use a Custom DNS Server

```bash
rdns -t A,AAAA -H 1.1.1.1 google.com
```

Query google.com using the 1.1.1.1 DNS server.

Multiple Domains

```bash
rdns google.com github.com example.com
```

Query multiple domains in one command.

Raw Packet Output

```bash
rdns -r google.com github.com
```

Display DNS packets as hexadecimal output.

Query All Record Types

```bash
rdns --all github.com
```

Send queries for all supported DNS record types.

TCP DNS Query

```bash
rdns -T google.com
```

Perform the DNS query over TCP.

Verbose Output

```bash
rdns -v google.com
```

Enable verbose output.

JSON Output

```bash
rdns --json google.com
```

Dump serialized JSON to stdout.

JSON Export to File

```bash
rdns --json-export out.json github.com
```

Save query results as JSON.

All Types + TCP + Verbose + JSON Export

```bash
rdns --all -v -T --json-export out.json github.com
```

Query all supported record types over TCP with verbose output, and export the results to a JSON file.

DNS Trace Mode

```bash
rdns --trace amazon.aws.com
```

Recursively trace DNS resolution from the root servers.

Limit the maximum number of hops:

```bash
rdns --trace -t NS --hops 10 amazon.aws.com
```

Limit the maximum number of queries:

```bash
rdns --trace --queries 20 amazon.aws.com
```

---

Options

Core Options

Option Description Default
-t, --type <type> DNS record type(s), comma-separated A
-H, --host <host> DNS server IP or hostname 1.1.1.1
-p, --port <port> DNS port 53
--timeout <sec> Request timeout (seconds) 60
--protocol <tcp/udp> Transmission protocol udp
--class <class> DNS record class IN
--all Send requests for all supported record types –
--batch Send all domains in one DNS packet –
-T, --tcp Perform DNS query over TCP (same as --protocol tcp) –
--trace Enable trace mode (recursive resolution) –
--hops <number> Maximum hops in trace mode 20
--queries <number> Maximum queries in trace mode 50
--list <item> List available record types, classes

Output Options

Option Description
-v, --verbose Verbose output
--debug Debug output (more detailed)
-r, --raw Hex dump of raw DNS packets
-q, --quiet, --silent Minimal output
--no-color Disable ANSI colors
--json Dump serialized JSON to stdout
--json-export <file> Save serialized JSON to a file

General Options

Option Description
-h, --quickhelp Show quick help
--help Show full help
--version Show version

---

Defaults

Parameter Default Value
DNS Server 1.1.1.1
Port 53
Timeout 60 seconds
Protocol udp
Record Type A
DNS Class IN
Hops (trace) 20
Queries (trace) 50

---

Flexible Option Placement

Options can be placed anywhere in the command. The parser automatically distinguishes between options and domains.

Example:

```bash
rdns -t AAAA -H 1.1.1.1 google.com -v -r github.com --timeout 20
```

This is equivalent to:

```bash
rdns google.com github.com -t AAAA -H 1.1.1.1 -v -r --timeout 20
```

---

Notes

· Multiple domains can be supplied in a single command.
· Record types can be comma-separated (e.g., A,AAAA,NS).
· Trace mode accepts only one domain and one record type.
· -T, --tcp is equivalent to --protocol tcp.
· --no-color disables ANSI color output (useful for scripts).
· Batch mode (--batch) packs all domains into a single DNS query packet.

---

Project

Repository: https://github.com/Rakibul-Hoque/rdns.git

Version

rdns version 1.1.0

License

See the repository for license information.