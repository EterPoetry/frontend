FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_SITE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist
COPY package*.json ./

EXPOSE 3000

CMD ["node", "server-dist/index.js"]
