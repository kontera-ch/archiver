# Kontera Archiver

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