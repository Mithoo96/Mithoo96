# Production image: builds the static site and runs the zero-framework Node server.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
RUN node scripts/build.js
# Leads fallback store — mount a persistent volume here.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server/index.js"]
