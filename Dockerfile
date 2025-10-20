# syntax=docker/dockerfile:1.7-labs

# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install minimal build tools (used only during build stage)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates git curl tar xz-utils unzip pkg-config clang rustc cargo \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack/yarn and pin Yarn version
RUN corepack enable && corepack prepare yarn@4.10.3 --activate \
    && yarn -v \
    && yarn config set nodeLinker node-modules

# Build-time env (Vite reads VITE_* at build time)
ARG VITE_API_BASE_URL
ARG VITE_PUBLIC_APP_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_PUBLIC_APP_URL=${VITE_PUBLIC_APP_URL}

# Copy minimal files for dependency install
COPY package.json yarn.lock ./

# Install deps (immutable if lock present; fallback to normal install)
RUN --mount=type=cache,target=/root/.yarn \
    --mount=type=cache,target=/root/.cache/yarn \
    yarn install --immutable || yarn install

# Copy the rest of the app and build
COPY . .
RUN yarn build

# ---- Runtime stage (serve static) ----
FROM nginx:1.25-alpine AS runtime
# SPA fallback to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets only
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
