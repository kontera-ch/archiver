import { NestInterceptor, ExecutionContext, CallHandler, Logger, Injectable } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import * as Sentry from '@sentry/node';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private logger: Logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      catchError((err: any) => {
        if (err.status && err.status === 400 && err.message) {
          this.logger.error(JSON.stringify(err));

          Sentry.captureMessage(`${request.method} to ${request.path} failed with status ${err.status}`, {
            extra: {
              message: JSON.stringify(err.message.message)
            }
          });
        } else {
          Sentry.captureException(err);
        }

        return throwError(err);
      })
    );
  }
}
