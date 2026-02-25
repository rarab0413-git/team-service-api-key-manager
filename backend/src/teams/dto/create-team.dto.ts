import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  monthlyBudget: number;
}






