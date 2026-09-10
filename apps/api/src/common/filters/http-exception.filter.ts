import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/** Minimal structural view of the Express response — avoids a hard @types/express dependency. */
interface ResponseLike {
  status(code: number): { json(body: unknown): unknown };
}

function errorName(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

/**
 * Global exception filter. Every error leaves the API as consistent JSON:
 * Nest's default shape (statusCode/message/error) plus `path` and `timestamp`.
 * Unknown (non-HTTP) errors never leak internals — they become a JSON 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request = ctx.getRequest<{ url?: string }>();
    const path = request.url ?? '/';
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      const body: ErrorResponseBody =
        typeof payload === 'string'
          ? {
              statusCode: status,
              message: payload,
              error: errorName(status),
              path,
              timestamp,
            }
          : {
              statusCode: status,
              message: (payload as { message?: string | string[] }).message ?? 'Bad request',
              error: (payload as { error?: string }).error ?? errorName(status),
              path,
              timestamp,
            };

      response.status(body.statusCode).json(body);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      path,
      timestamp,
    });
  }
}