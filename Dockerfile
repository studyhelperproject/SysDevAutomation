# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run
FROM node:22-slim

WORKDIR /app

# Only copy production dependencies and built artifacts
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
# Copy other necessary runtime directories/files if any
COPY prompts ./prompts
COPY templates ./templates
COPY docs ./docs

# Cloud Run will provide the PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
