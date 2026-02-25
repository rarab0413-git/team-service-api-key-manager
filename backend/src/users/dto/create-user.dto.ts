import { IsEmail, IsInt, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsInt()
  @IsOptional()
  teamId?: number;

  @IsIn(['admin', 'user'])
  @IsOptional()
  role?: 'admin' | 'user';
}
