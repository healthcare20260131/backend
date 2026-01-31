import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    this.logger.log(`[REQ] ${method} ${url} ${JSON.stringify(body)}`);

    return next.handle().pipe(
      tap((data) => {
        this.logger.log(`[RES] ${method} ${url} - ${Date.now() - now}ms`);
      }),
    );
  }
}
