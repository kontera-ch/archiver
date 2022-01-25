require('dotenv').config();

import SentryLogger from '@/logger/SentryLogger';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './AppModule';
import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';

import express, { Application, json, Request, Response, text } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { SentryInterceptor } from './interceptors/SentryInterceptor';

declare const module: any;

export async function bootstrap(): Promise<{
  app: INestApplication;
  expressApp: Application;
}> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  adapter.use(Sentry.Handlers.requestHandler());
  const sentryLogger = new SentryLogger();

  const app = await NestFactory.create(AppModule, adapter, {
    logger: sentryLogger
  });

  const rawBodySaver = function (req: Request, _res: Response, buf: Buffer, encoding: BufferEncoding) {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding || 'utf8');
    }
  };

  app.use(json({ verify: rawBodySaver, limit: '50mb' }));
  app.use(text({ verify: rawBodySaver, limit: '50mb' }));
  app.useGlobalInterceptors(new SentryInterceptor());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors();

  const configService = app.get(ConfigService);
  sentryLogger.configureSentry(configService, app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production' // do not show errors in production setups
    })
  );

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  await app.init();

  sentryLogger.startupDone();

  return { app, expressApp };
}
