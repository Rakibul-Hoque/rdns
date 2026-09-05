RDNS

A simple and lightweight DNS query tool built with JavaScript.

RDNS can query DNS records using Node.js or Bun, with support for multiple record types, custom DNS servers, TCP/UDP transport, batch queries, raw packet output, JSON output, and DNS trace mode.

Features

- DNS record queries
- Multiple domains in a single command
- Multiple record types
- Custom DNS server and port
- UDP and TCP DNS queries
- DNS trace mode
- Configurable trace hops and queries
- Batch DNS queries
- Raw DNS packet hex output
- Verbose and debug output
- Quiet mode
- JSON output
- JSON file export
- ANSI color control
- Runs with Node.js or Bun
- Standalone Bun-compiled executable

Requirements

You can run RDNS using either:

- "Node.js" (https://nodejs.org/)
- "Bun" (https://bun.sh/)

Installation

Clone the repository:

git clone https://github.com/Rabiul-Hoque/rdns.git

Enter the project directory:

cd rdns

No additional installation is required for running the source directly.

Run with Node.js

node src/index.js google.com

Run with Bun

bun src/index.js google.com

Standalone Binary

RDNS can also be distributed as a standalone executable compiled with Bun.

The standalone binary contains the Bun runtime together with the RDNS application code, so users do not need to separately install Node.js or Bun to run the compiled binary.

Example:

./rdns google.com

The exact binary name may vary depending on the target platform and build configuration.

Usage

rdns [options] <domain...>

Basic Query

rdns google.com

Perform a standard DNS query.

Query Specific Record Types

rdns -t A,AAAA google.com

Query both IPv4 ("A") and IPv6 ("AAAA") records.

Use a Custom DNS Server

rdns -t A,AAAA -h 1.1.1.1 google.com

Query "google.com" using the "1.1.1.1" DNS server.

Multiple Domains

rdns google.com github.com example.com

Query multiple domains in one command.

Raw Packet Output

rdns -r google.com github.com example.com

Display DNS packets as hexadecimal output.

Query All Record Types

rdns --all github.com

Send queries for all supported DNS record types.

TCP DNS Query

rdns --T google.com

Perform the DNS query over TCP.

Verbose Output

rdns -v google.com

Enable verbose output.

JSON Export

rdns --json-export out.json github.com

Save the query results as JSON.

All Types + TCP + Verbose + JSON

rdns --all -v -T --json-export out.json github.com

Query all supported record types over TCP with verbose output and export the results to a JSON file.

DNS Trace

Enable trace mode with:

rdns --trace amazon.aws.com

You can also limit the maximum number of hops:

rdns --trace -t NS --hops 10 amazon.aws.com

Trace queries can also be limited:

rdns --trace --queries 20 amazon.aws.com

Options

-t, --type <type>          DNS record type(s)

-h, --host <host>          DNS server
                           default: 8.8.8.8

-p, --port <port>          UDP port
                           default: 53

    --timeout <sec>        Request timeout
                           default: 60

    --protocol <tcp/udp>   Transmission protocol
                           default: udp

    --all                  Send requests for all record types

    --batch                Send all domains in one DNS packet

-T, --tcp                  Perform DNS query over TCP

    --trace                Enable trace mode

    --hops <number>        Maximum hops in trace mode
                           default: 20
    
    --queries <number>     Maximum queries in trace mode
                           default: 50

-v, --verbose              Verbose output

    --debug                Debug output

-r, --raw                  Hex dump packets

-q, --quiet                Minimal output

    --no-color             Disable ANSI colors

    --json                 Output serialized JSON

    --json-export <file>   Save JSON output to a file

-h, --quickhelp            Show quick help

    --help                 Show full help

    --version              Show version

Defaults

DNS Server:  8.8.8.8
Port:        53
Timeout:     60 seconds
Protocol:    udp
Hops:        20
Queries:     50
Flexible Option Placement

RDNS options can be placed anywhere in the command. The parser automatically detects switches.

For example:

rdns -t AAAA -h 1.1.1.1 google.com -v -r github.com --timeout 20

Options do not have to appear before the domains.

Project

Repository:

https://github.com/Rabiul-Hoque/rdns

Version

rdns version 1.0.0

License

See the repository for license information.