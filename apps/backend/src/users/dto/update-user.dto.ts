// apps/backend/src/users/dto/update-user.dto.ts
import { IsIn, IsOptional } from 'class-validator';
export class UpdateUserDto {
  @IsOptional() @IsIn(['pending', 'active', 'disabled']) status?: 'pending' | 'active' | 'disabled';
  @IsOptional() @IsIn(['admin', 'operator', 'viewer']) role?: 'admin' | 'operator' | 'viewer';
}
