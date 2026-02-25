export class UserResponseDto {
  id: number;
  email: string;
  teamId: number | null;
  teamName: string | null;
  teamMonthlyBudget: number | null;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
