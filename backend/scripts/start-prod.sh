#!/bin/sh
set -e
cd backend
echo "Running database migrations..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss
echo "Starting TransitOps API on port ${PORT:-4000}..."
exec node dist/server.js