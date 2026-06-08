#!/usr/bin/env bash
set -euo pipefail

CADDYFILE=${CADDYFILE:-/srv/proxy/Caddyfile}
SITES=${SITES:-"eastvillageeverything.nyc www.eastvillageeverything.nyc"}

if [[ ! -f "$CADDYFILE" ]]; then
  echo "Missing Caddyfile: $CADDYFILE" >&2
  exit 1
fi

BACKUP="${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CADDYFILE" "$BACKUP"

python3 - "$CADDYFILE" "$SITES" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
sites = sys.argv[2].split()
text = path.read_text()

def find_site_block(caddyfile: str, site: str) -> tuple[int, int]:
    offset = 0
    for line in caddyfile.splitlines(keepends=True):
        stripped = line.strip()
        if stripped == f"{site} {{":
            start = offset
            break
        offset += len(line)
    else:
        raise SystemExit(f"Could not find Caddy site block: {site}")

    brace = 0
    for idx in range(start, len(caddyfile)):
        char = caddyfile[idx]
        if char == "{":
            brace += 1
        elif char == "}":
            brace -= 1
            if brace == 0:
                return start, idx + 1

    raise SystemExit(f"Could not parse Caddy site block: {site}")

for site in sites:
    start, end = find_site_block(text, site)
    replacement = f"""{site} {{
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    handle /admin* {{
        reverse_proxy eve-admin:3001
    }}

    handle {{
        reverse_proxy eve-app:3000
    }}
}}"""
    text = text[:start] + replacement + text[end:]

path.write_text(text)
PY

CADDY_CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | awk '$1 == "proxy-caddy-1" { print $1; exit } /caddy/ { print $1; exit }')
if [[ -z "$CADDY_CONTAINER" ]]; then
  echo "Could not find running Caddy container" >&2
  exit 1
fi

docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile
docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
