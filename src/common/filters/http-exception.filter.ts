import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Terjadi kesalahan internal pada server.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        error = (res as any).error || error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    if (status === HttpStatus.NOT_FOUND && !request.url.startsWith('/api')) {
      const acceptsHtml = request.accepts && request.accepts('html');
      if (acceptsHtml) {
        const notFoundPath = path.resolve(process.cwd(), 'public', '404.html');
        if (fs.existsSync(notFoundPath)) {
          return response.status(HttpStatus.NOT_FOUND).sendFile(notFoundPath);
        }
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
      ...(isProduction ? {} : { stack: (exception as any)?.stack }),
    });
  }
}
