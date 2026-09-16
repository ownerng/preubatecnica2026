FROM oven/bun:1 AS build
WORKDIR /app
# package.json/lock en su propia capa: Docker cachea las dependencias
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY index.html ./
COPY src ./src
RUN bun run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
