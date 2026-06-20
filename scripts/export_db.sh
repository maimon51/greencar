#!/usr/bin/env bash

# Find the project root directory regardless of where the script is run from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load the environment variables from the .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
else
  echo "Error: .env file not found in $PROJECT_ROOT"
  exit 1
fi

if [ -z "$DATABASE_URL_UNPOOLED" ]; then
  echo "Error: DATABASE_URL_UNPOOLED is missing from the .env file"
  exit 1
fi

echo "⏳ Starting database export... (This might take a few minutes depending on the data size)"

# Use Docker to run pg_dump (no local PostgreSQL installation needed)
# We use the UNPOOLED connection to prevent disconnects during large dumps
if docker run --rm postgres:17 pg_dump "$DATABASE_URL_UNPOOLED" --clean --if-exists --no-owner --no-privileges > "$PROJECT_ROOT/greencar_export.sql"; then
  echo "✅ Export completed successfully!"
  echo "📄 The file has been saved to: $PROJECT_ROOT/greencar_export.sql"
else
  echo "❌ Error: The database export failed. Check the errors above."
  # Remove the empty/broken sql file so we don't accidentally use it
  rm -f "$PROJECT_ROOT/greencar_export.sql"
  exit 1
fi
