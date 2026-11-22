# Build stage
FROM node:24.22.3-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy configs
COPY tsconfig.json .
COPY tsconfig.app.json .
COPY tsconfig.node.json .
COPY tailwind.config.js .
COPY eslint.config.js .
COPY vite.config.ts .

# Copy app code and assets
COPY index.html .
COPY public ./public
COPY src ./src

# Copy config template and generator script
COPY config.json.template ./
COPY scripts ./scripts
RUN mkdir -p public

# Build the application (build script generates public/config.json then builds)
RUN npm run build

## Runner stage
FROM nginx:1.31.9-alpine3.24-slim@sha256:5bfced78d24d644270bedb0a9968697042e38d5c03fb6354603df025279c1cbe AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy runtime config template and entrypoint
COPY config.json.template /etc/perga/config.json.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
