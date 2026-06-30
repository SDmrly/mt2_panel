// apps/backend/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString() @MinLength(3) username!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
