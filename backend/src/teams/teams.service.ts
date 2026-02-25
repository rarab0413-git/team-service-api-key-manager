import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TeamsRepository, TeamRow } from './teams.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  private mapToResponse(row: TeamRow): TeamResponseDto {
    return new TeamResponseDto({
      id: row.id,
      name: row.name,
      monthlyBudget: Number(row.monthly_budget),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamsRepository.findAll();
    return teams.map((team) => this.mapToResponse(team));
  }

  async findById(id: number): Promise<TeamResponseDto> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return this.mapToResponse(team);
  }

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findByName(dto.name);
    if (existingTeam) {
      throw new ConflictException(`Team with name '${dto.name}' already exists`);
    }

    const id = await this.teamsRepository.create(dto.name, dto.monthlyBudget);
    return this.findById(id);
  }

  async update(id: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    if (dto.name && dto.name !== team.name) {
      const existingTeam = await this.teamsRepository.findByName(dto.name);
      if (existingTeam) {
        throw new ConflictException(`Team with name '${dto.name}' already exists`);
      }
    }

    await this.teamsRepository.update(id, {
      name: dto.name,
      monthlyBudget: dto.monthlyBudget,
    });

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const team = await this.teamsRepository.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    await this.teamsRepository.delete(id);
  }
}






