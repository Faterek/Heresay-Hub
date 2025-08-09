##### DEPENDENCIES

FROM oven/bun:1-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production
# Install drizzle-kit and typescript for migrations in production
RUN cd /temp/prod && bun add drizzle-kit typescript

##### BUILDER

FROM base AS prerelease
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN SKIP_ENV_VALIDATION=1 bun run build

##### RUNNER

FROM base AS release
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies and built application
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/next.config.js ./
COPY --from=prerelease /app/public ./public
COPY --from=prerelease /app/package.json ./package.json
COPY --from=prerelease /app/.next/standalone ./
COPY --from=prerelease /app/.next/static ./.next/static

# Copy drizzle config and migrations
COPY --from=prerelease /app/drizzle.config.ts ./
COPY --from=prerelease /app/drizzle ./drizzle
COPY --from=prerelease /app/src/env.js ./src/env.js
COPY --from=prerelease /app/src/server/db/schema.ts ./src/server/db/schema.ts
COPY --from=prerelease /app/tsconfig.json ./tsconfig.json

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
ENV PORT=3000

# Run the app with startup script that includes migrations
RUN chown -R bun:bun /app   
USER bun
CMD ["./start.sh"]