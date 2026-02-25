import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';

@Controller('api/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    return this.teamsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<TeamResponseDto> {
    return this.teamsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.teamsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.teamsService.delete(id);
  }
}






