import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
@Injectable()
export class TokenBlacklistService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async blacklist(jti: string, ttlSec: number) { await this.redis.set(`bl:${jti}`, '1', 'EX', ttlSec); }
  async isBlacklisted(jti: string) { return (await this.redis.exists(`bl:${jti}`)) === 1; }
  async saveRefresh(jti: string, userId: string, ttlSec: number) { await this.redis.set(`rt:${jti}`, userId, 'EX', ttlSec); }
  async getRefresh(jti: string) { return this.redis.get(`rt:${jti}`); }
  async revokeRefresh(jti: string) { await this.redis.del(`rt:${jti}`); }
  async linkAccessToRefresh(accessJti: string, refreshJti: string, ttlSec: number) { await this.redis.set('ar:' + accessJti, refreshJti, 'EX', ttlSec); }
  async getLinkedRefresh(accessJti: string) { return this.redis.get('ar:' + accessJti); }
}
