FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY apps/admin-mobile/package.json apps/admin-mobile/package-lock.json ./
RUN npm ci
COPY apps/admin-mobile/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY deploy/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
