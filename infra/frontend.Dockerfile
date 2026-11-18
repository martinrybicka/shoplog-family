FROM node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9 AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.30.2-alpine@sha256:5f979dcfed4ce6461873f087e8c980d6e29b084b9e8776d9704a7e989b5f4898 AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/nginx/common-http.conf /etc/nginx/conf.d/00-common.conf
COPY infra/nginx/proxy-api.conf /etc/nginx/shoplog/proxy-api.conf
COPY infra/nginx/security-headers.conf /etc/nginx/shoplog/security-headers.conf
COPY infra/nginx/web.conf.template /etc/nginx/templates/default.conf.template
ENV PUBLIC_SCHEME=http
EXPOSE 8080
