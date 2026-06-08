#!/usr/bin/env bash
set -euo pipefail

CADDYFILE=${CADDYFILE:-/srv/proxy/Caddyfile}
SITE=${SITE:-eastvillageeverything.nyc}

if [[ ! -f "$CADDYFILE" ]]; then
  echo "Missing Caddyfile: $CADDYFILE" >&2
  exit 1
fi

BACKUP="${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CADDYFILE" "$BACKUP"

python3 - "$CADDYFILE" "$SITE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
site = sys.argv[2]
text = path.read_text()

marker = f"{site} {{"
start = text.find(marker)
if start == -1:
    raise SystemExit(f"Could not find Caddy site block: {site}")

brace = 0
end = None
for idx in range(start, len(text)):
    char = text[idx]
    if char == "{":
        brace += 1
    elif char == "}":
        brace -= 1
        if brace == 0:
            end = idx + 1
            break

if end is None:
    raise SystemExit(f"Could not parse Caddy site block: {site}")

replacement = f"""{site} {{
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"

    handle /admin* {{
        reverse_proxy eve-admin:3001
    }}

    handle {{
        reverse_proxy eve-app:3000
    }}
}}"""

next_text = text[:start] + replacement + text[end:]
path.write_text(next_text)
PY

CADDY_CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | awk '$1 == "proxy-caddy-1" { print $1; exit } /caddy/ { print $1; exit }')
if [[ -z "$CADDY_CONTAINER" ]]; then
  echo "Could not find running Caddy container" >&2
  exit 1
fi

docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile
docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
