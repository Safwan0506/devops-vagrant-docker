FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

# La version (SHA du commit) est injectée par le pipeline et affichée sur la page
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION PORT=3000

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server.js"]
