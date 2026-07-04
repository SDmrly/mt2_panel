// apps/backend/src/users/users.controller.ts
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveGuard } from '../auth/guards/active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppException } from '../common/app-exception';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

@UseGuards(JwtAuthGuard, ActiveGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly audit: AuditService) {}

  @Get() list() { return this.users.list(); }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    if (dto.status === undefined && dto.role === undefined) {
      throw new AppException('no_fields_to_update', HttpStatus.BAD_REQUEST, 'Güncellenecek alan yok');
    }
    const res = await this.users.update(id, req.user.id, dto);
    const action = dto.status === 'active' ? 'user_approve'
      : dto.status === 'disabled' ? 'user_disable'
      : dto.status === 'pending' ? 'user_enable'  // pending'e çekme nadiren; genel
      : dto.role ? 'user_role_change' : 'user_role_change';
    await this.audit.record({ action: action as any, result: 'success', userId: req.user.id, username: req.user.username, target: res.username, ip: req.ip, detail: { status: res.status, role: res.role } });
    return res;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.users.remove(id, req.user.id);
    await this.audit.record({ action: 'user_delete', result: 'success', userId: req.user.id, username: req.user.username, target: id, ip: req.ip });
    return { ok: true };
  }
}
