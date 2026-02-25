import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserTeamDto } from './dto/update-user-team.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  async findByEmail(@Query('email') email: string): Promise<UserResponseDto | null> {
    if (!email) {
      return null;
    }
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Get('team/:teamId')
  async findByTeamId(@Param('teamId', ParseIntPipe) teamId: number): Promise<UserResponseDto[]> {
    return this.usersService.findByTeamId(teamId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Put(':id/team')
  async updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserTeamDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateTeam(id, dto);
  }

  @Put(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: 'admin' | 'user',
  ): Promise<UserResponseDto> {
    return this.usersService.updateRole(id, role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.delete(id);
  }
}
