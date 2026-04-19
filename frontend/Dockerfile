# ------- Build stage -------
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL=https://api.admin.visitsrilanka360.com/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ------- Serve stage -------
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
