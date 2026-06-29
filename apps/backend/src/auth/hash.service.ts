// apps/backend/src/auth/hash.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class HashService {
  hash(plain: string): Promise<string> { return bcrypt.hash(plain, 10); }
  verify(plain: string, hash: string): Promise<boolean> { return bcrypt.compare(plain, hash); }
}
