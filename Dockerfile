# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose the application port
EXPOSE 3001

# Start the application in production mode
CMD ["sh", "-c", "pnpm run migration:run:prod && pnpm run start:prod"]
