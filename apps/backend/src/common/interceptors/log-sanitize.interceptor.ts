// apps/backend/src/common/interceptors/log-sanitize.interceptor.ts
const SENSITIVE = ['password', 'token', 'secret', 'authorization'];
export function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) =>
    [k, SENSITIVE.includes(k.toLowerCase()) ? '***' : v]));
}

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LogSanitizeInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  lastSanitized: Record<string, unknown> | null = null; // test gözlemi
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    if (req?.body && typeof req.body === 'object') {
      this.lastSanitized = sanitize(req.body as Record<string, unknown>);
      this.logger.debug(`${req.method} ${req.url} ${JSON.stringify(this.lastSanitized)}`);
    }
    return next.handle();
  }
}
