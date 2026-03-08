# Multi-stage build for React + Vite application
ARG NODE_VERSION=20

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

ARG VITE_JUSSIMATIC_BACKEND_API_BASE_URL
ENV VITE_JUSSIMATIC_BACKEND_API_BASE_URL=${VITE_JUSSIMATIC_BACKEND_API_BASE_URL}
ARG VITE_JUSSILOG_BACKEND_API_BASE_URL
ENV VITE_JUSSILOG_BACKEND_API_BASE_URL=${VITE_JUSSILOG_BACKEND_API_BASE_URL}
ARG VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL
ENV VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL=${VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration as template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy and make startup script executable
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 8080 (default for Google Cloud)
EXPOSE 8080

# Use custom entrypoint that handles PORT env variable
ENTRYPOINT ["/docker-entrypoint.sh"]
