#!/bin/sh
# Apply committed Prisma migrations. Fails loudly instead of pushing schema changes.
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Database is up to date."
