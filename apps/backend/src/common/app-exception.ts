// apps/backend/src/common/app-exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(code: string, status: HttpStatus, message?: string) {
    super({ statusCode: status, code, message: message ?? code }, status);
  }
}
