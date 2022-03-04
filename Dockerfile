# stage 1: use full node for deps (with python and git)
FROM node:16 as dep

RUN mkdir /app
WORKDIR /app

ADD package.json /app/package.json
ADD package-lock.json /app/package-lock.json

RUN npm ci

ENV NODE_ENV production
ENV PORT 4343

# copy src
COPY . /app/

# build args
ARG GIT_SHA

# compile to check for errors
RUN npm run build

# default env variables
ENV TYPEORM_TYPE="postgres"
ENV TYPEORM_HOST="postgres"
ENV TYPEORM_PORT=5432
ENV TYPEORM_USERNAME="postgres"
ENV TYPEORM_PASSWORD="postgres"
ENV TYPEORM_DATABASE="postgres"
ENV TYPEORM_USECOMPILED=false

EXPOSE 4343

FROM node:16-alpine

RUN mkdir /app
WORKDIR /app

# default env variables
ENV TYPEORM_USECOMPILED=true

COPY --from=dep /app/dist /app/dist
COPY --from=dep /app/node_modules /app/node_modules
COPY --from=dep /app/package.json /app/package.json
COPY --from=dep /app/package-lock.json /app/package-lock.json
COPY --from=dep /app/tsconfig.json /app/tsconfig.json

CMD ["npm", "run", "start:prod"]