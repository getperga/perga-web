#!/bin/sh
set -euo pipefail

# Defaults (can be overridden by environment)
: "${API_BASE_URL:=http://localhost:8080/api/v1}"
: "${IS_SIGNUP_DISABLED:=false}"
: "${GOOGLE_CLIENT_ID:=}"

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
