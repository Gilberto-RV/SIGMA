# Panel administrativo Gestory (React + Vite), servido con Nginx.
# Las variables VITE_* se incrustan al compilar: se pasan como build args.
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_MAPTILER_API_KEY=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_MAPTILER_API_KEY=$VITE_MAPTILER_API_KEY
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
