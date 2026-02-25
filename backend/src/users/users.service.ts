import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository, UserRow } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserTeamDto } from './dto/update-user-team.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  private mapToResponse(row: UserRow): UserResponseDto {
    return new UserResponseDto({
      id: row.id,
      email: row.email,
      teamId: row.team_id,
      teamName: row.team_name || null,
      teamMonthlyBudget: row.team_monthly_budget ? Number(row.team_monthly_budget) : null,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => this.mapToResponse(user));
  }

  async findById(id: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.mapToResponse(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return this.mapToResponse(user);
  }

  async findByTeamId(teamId: number): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findByTeamId(teamId);
    return users.map((user) => this.mapToResponse(user));
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    const id = await this.usersRepository.create(
      dto.email,
      dto.teamId || null,
      dto.role || 'user'
    );
    return this.findById(id);
  }

  async updateTeam(id: number, dto: UpdateUserTeamDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.usersRepository.updateTeam(id, dto.teamId ?? null);
    return this.findById(id);
  }

  async updateRole(id: number, role: 'admin' | 'user'): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.usersRepository.updateRole(id, role);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.usersRepository.delete(id);
  }
}
