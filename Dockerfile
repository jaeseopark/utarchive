# Stage 1: install dependencies
FROM node:24.17.0-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json backend/tsconfig.json ./backend/
COPY frontend/package.json frontend/tsconfig.json ./frontend/

RUN npm ci

# Stage 2: build the frontend and backend
FROM deps AS build
WORKDIR /app
COPY . .

RUN cd frontend && npm run build && cd ../backend && npm run build

# Stage 3: production image
FROM node:24.17.0-alpine AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist

# Install PostgreSQL client for database migrations
RUN apk add --no-cache postgresql-client

# Copy migration files (drizzle-kit migrate will apply these)
COPY backend/migrations ./backend/migrations
COPY backend/drizzle.config.ts ./backend/

# Copy entrypoint script
COPY docker/entrypoint.prod.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
