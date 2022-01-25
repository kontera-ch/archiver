import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

export default class SentryLogger extends Logger {
  private isStartupDone = false;

  configureSentry(configService: ConfigService, app: INestApplication) {
    Sentry.init({
      dsn: configService.get<string>('SENTRY_DSN'),
      integrations: [
        new RewriteFrames({
          root: __dirname || process.cwd()
        }),
        new Tracing.Integrations.Express({
          app: app.getHttpServer()
        })
      ],
      tracesSampleRate: process.env.ENVIRONMENT === 'localhost' ? 0.05 : process.env.ENVIRONMENT === 'production' ? 0.01 : 1,
      environment: process.env.ENVIRONMENT,
      release: configService.get<string>('GIT_SHA')
    });

    app.use(Sentry.Handlers.tracingHandler());
  }

  log(message: string, context?: string) {
    if (this.isStartupDone) {
      Sentry.addBreadcrumb({ message: message, level: Sentry.Severity.Log });
      super.log(message, context);
    }
  }

  error(message: string, trace?: string, context?: string) {
    Sentry.addBreadcrumb({ message: message, level: Sentry.Severity.Error });
    super.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    Sentry.addBreadcrumb({ message: message, level: Sentry.Severity.Warning });
    super.warn(message, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
  }

  startupDone() {
    this.isStartupDone = true;
    super.log('Bootstrap done.');
  }
}
