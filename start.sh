#!/bin/sh

# Exit on any error
set -e

echo "Running database migrations..."
npm run db:migrate

echo "Starting the application..."
exec node server.js
