# Lightweight Node 20 image to reduce build time and size
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps first for better caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the server source
COPY . .

# Expose the port Railway provides via $PORT (defaults to 8080 there)
EXPOSE 8080

# Start the server
CMD ["node", "server-supabase.js"]
