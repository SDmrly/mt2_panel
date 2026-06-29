// apps/backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PanelRole } from '../../database/entities/panel-user.entity';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: PanelRole[]) => SetMetadata(ROLES_KEY, roles);
