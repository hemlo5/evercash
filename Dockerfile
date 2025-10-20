# syntax=docker/dockerfile:1.7-labs

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Enable corepack/yarn
RUN corepack enable

# Copy minimal files for dependency install
COPY package.json yarn.lock ./

# Install deps (immutable if lock present; fallback to normal install)
RUN yarn install --immutable || yarn install

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
