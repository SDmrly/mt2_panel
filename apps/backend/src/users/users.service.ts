// apps/backend/src/users/users.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

export interface PublicUser {
  id: string; username: string; email: string | null;
  status: string; role: string; createdAt: Date; lastLogin: Date | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly repo: Repository<PanelUser>) {}

  private toPublic(u: PanelUser): PublicUser {
    return { id: u.id, username: u.username, email: u.email, status: u.status, role: u.role, createdAt: u.createdAt, lastLogin: u.lastLogin };
  }

  async list(): Promise<PublicUser[]> {
    const users = await this.repo.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => this.toPublic(u));
  }

  private async activeAdminCount(): Promise<number> {
    return this.repo.count({ where: { status: 'active', role: 'admin' } });
  }

  async update(id: string, actorId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Kullanıcı yok');
    const willDisable = dto.status === 'disabled';
    const willDemote = dto.role && dto.role !== 'admin' && u.role === 'admin';
    // kendini koruma
    if (actorId === id && (willDisable || willDemote)) throw new BadRequestException('Kendinizi devre dışı bırakamaz/düşüremezsiniz');
    // son aktif admin koruma
    if ((willDisable || willDemote) && u.role === 'admin' && u.status === 'active' && (await this.activeAdminCount()) <= 1) {
      throw new BadRequestException('Son aktif admin değiştirilemez');
    }
    if (dto.status !== undefined) u.status = dto.status;
    if (dto.role !== undefined) u.role = dto.role;
    const saved = await this.repo.save(u);
    return this.toPublic(saved);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Kullanıcı yok');
    if (actorId === id) throw new BadRequestException('Kendinizi silemezsiniz');
    if (u.role === 'admin' && u.status === 'active' && (await this.activeAdminCount()) <= 1) {
      throw new BadRequestException('Son aktif admin silinemez');
    }
    await this.repo.delete(id);
  }
}
