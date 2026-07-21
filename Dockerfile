FROM node:24-alpine AS build

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package files first for better caching
COPY package.json package-lock.json .npmrc ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the API server
RUN npm run build:api --if-present

# Build the frontend
RUN npm run build:web --if-present

# ─── Production image ──────────────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl ca-certificates

# Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --omit=dev

# Copy built artifacts from build stage
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/beckbest-bridal/dist ./artifacts/beckbest-bridal/dist
COPY --from=build /app/lib ./lib
COPY --from=build /app/node_modules ./node_modules

# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]