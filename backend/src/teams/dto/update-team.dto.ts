import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyBudget?: number;
}






