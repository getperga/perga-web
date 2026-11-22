#!/bin/sh
set -euo pipefail

# Defaults (can be overridden by environment)
: "${API_BASE_URL:=http://localhost:8080/api/v1}"
: "${IS_SIGNUP_DISABLED:=false}"
: "${GOOGLE_CLIENT_ID:=}"
: "${CSP_MODE:=report-only}"

# derive a CSP source without allowing credentials or nginx configuration syntax
case "$API_BASE_URL" in
  //*) echo "API_BASE_URL must not be a protocol-relative URL." >&2; exit 1 ;;
  /*) csp_api_source="'self'" ;;
  http://*|https://*)
    csp_api_source="$(printf '%s' "$API_BASE_URL" | sed 's#^\(https\?://[^/]*\).*#\1#')"
    if ! printf '%s\n' "$csp_api_source" | LC_ALL=C grep -Eq '^https?://([A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(:[0-9]+)?$'; then
      echo "API_BASE_URL must use an HTTP(S) URL without credentials." >&2
      exit 1
    fi
    ;;
  *) echo "API_BASE_URL must be an HTTP(S) URL or a root-relative path." >&2; exit 1 ;;
esac

: "${CSP_POLICY:=default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' $csp_api_source https://accounts.google.com; frame-src https://accounts.google.com; img-src 'self' data: blob: $csp_api_source; font-src 'self'; worker-src 'self'; form-action 'self'}"

# a policy is an HTTP header, never arbitrary nginx configuration or variables
case "$CSP_POLICY" in
  *'"'*|*'\'*|*'$'*|*'
'*) echo "CSP_POLICY contains unsafe header characters." >&2; exit 1 ;;
esac
if printf '%s' "$CSP_POLICY" | LC_ALL=C grep -q '[[:cntrl:]]'; then
  echo "CSP_POLICY contains control characters." >&2
  exit 1
fi

case "$CSP_MODE" in
  report-only) csp_header=Content-Security-Policy-Report-Only ;;
  enforce) csp_header=Content-Security-Policy ;;
  off) csp_header= ;;
  *) echo "CSP_MODE must be report-only, enforce or off." >&2; exit 1 ;;
esac
if [ -n "$csp_header" ]; then
  printf 'add_header %s "%s" always;\n' "$csp_header" "$CSP_POLICY" > /etc/nginx/perga-security.conf
else
  printf '# CSP is managed by the deployment proxy\n' > /etc/nginx/perga-security.conf
fi

# Ensure boolean strings like true/True/1 and false/False/0
case "$(printf %s "$IS_SIGNUP_DISABLED" | tr '[:upper:]' '[:lower:]')" in
  true|1) IS_SIGNUP_DISABLED=true ;;
  false|0) IS_SIGNUP_DISABLED=false ;;
  *) IS_SIGNUP_DISABLED=false ;;
esac

export API_BASE_URL IS_SIGNUP_DISABLED GOOGLE_CLIENT_ID

TEMPLATE="/etc/perga/config.json.template"
TARGET="/usr/share/nginx/html/config.json"

# Generate runtime config.json
if [ -f "$TEMPLATE" ]; then
  envsubst < "$TEMPLATE" > "$TARGET"
  echo "Generated runtime $TARGET"
else
  echo "Template $TEMPLATE not found; skipping runtime config generation" >&2
fi

# Exec the passed command (default: nginx)
exec "$@"
