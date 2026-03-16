FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# The app uses ts-node to run directly from source
# Cloud Run will provide the PORT environment variable
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
