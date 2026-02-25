import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto/api-key-response.dto';

@Controller('api/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async findAll(@Query('teamId') teamId?: string): Promise<ApiKeyResponseDto[]> {
    if (teamId) {
      return this.apiKeysService.findByTeamId(parseInt(teamId, 10));
    }
    return this.apiKeysService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateApiKeyDto): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeysService.create(dto);
  }

  @Put(':id/revoke')
  async revoke(@Param('id', ParseIntPipe) id: number): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.revoke(id);
  }

  @Put(':id/models')
  async updateAllowedModels(
    @Param('id', ParseIntPipe) id: number,
    @Body('models') models: string[],
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.updateAllowedModels(id, models);
  }

  @Put(':id/features')
  async updateAllowedFeatures(
    @Param('id', ParseIntPipe) id: number,
    @Body('features') features: string[],
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.updateAllowedFeatures(id, features);
  }
}





