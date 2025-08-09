#!/bin/sh

# Exit on any error
set -e

echo "Running database migrations..."
bun run db:migrate

echo "Starting the application..."
exec bun run server.js
