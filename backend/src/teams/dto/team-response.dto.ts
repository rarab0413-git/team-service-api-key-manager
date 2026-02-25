export class TeamResponseDto {
  id: number;
  name: string;
  monthlyBudget: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TeamResponseDto>) {
    Object.assign(this, partial);
  }
}






