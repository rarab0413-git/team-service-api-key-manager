import { IsInt, IsOptional } from 'class-validator';

export class UpdateUserTeamDto {
  @IsInt()
  @IsOptional()
  teamId?: number | null;
}
