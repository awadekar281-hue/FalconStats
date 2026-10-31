import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    response.status(status).json({
      error: { code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: typeof detail === 'string' ? detail : (detail as { message?: unknown }).message ?? 'Request failed' },
      meta: { requestId: String(request.headers['x-request-id'] ?? randomUUID()), timestamp: new Date().toISOString(), path: request.originalUrl },
    });
  }
}
