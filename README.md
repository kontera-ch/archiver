# Kontera Archiver

# Prerequisites
The following things are necessary to run the Archiver:

* NodeJS >= v16
* NPM or compatible package manager
* PostgreSQL >= v12

Please configure the following environment variables:

```
# PostgreSQL Task Queue Configuration
PGBOSS_DATABASE=
PGBOSS_USERNAME=kontera
PGBOSS_PASSWORD=kontera
PGBOSS_HOST=localhost
PGBOSS_PORT=5432

# Task Queue Configuration
STAMP_QUEUE_BATCH_SIZE=
ARCHIVE_QUEUE_BATCH_SIZE=
WEBHOOK_QUEUE_BATCH_SIZE=

# Google Storage Backend (optional)
GCS_ARCHIVE_BUCKET_NAME=
GOOGLE_APPLICATION_CREDENTIALS=
```



# Development
The Kontera Archiver is a NestJS based project, split in two parts.

* src/lib, which contains all the necessary proof-generation logic
* src/*, which contains the REST API and scheduling logic and has been developed more specific to the use case of Kontera

To start the project for local development, follow the outlined steps:

```
# Instructions were written for Node v16.13.1 / NPM v8.1.2

# install dependencies
$ npm install

# copy default dependencies, make sure to fill in any gaps
$ cp .env.default .env

# run tests to make sure everything is correctyl setup
$ npm test

# run in development mode
$ npm run start:dev
```

# Production
Simply build the project for production, make sure all necessary env variables are configured. Either as .env file or supplied in the container if deployed using docker.

```
$ npm run build
$ npm run start:prod
```