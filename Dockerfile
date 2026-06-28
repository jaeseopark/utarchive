# Stage 1: install dependencies
FROM node:24.17.0-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json backend/tsconfig.json ./backend/
COPY frontend/package.json frontend/tsconfig.json ./frontend/

RUN npm install

# Stage 2: build the frontend and backend
FROM deps AS build
WORKDIR /app
COPY . .

RUN cd backend && npm run build

# Stage 3: production image
FROM node:24.17.0-alpine AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
