import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './api-keys.repository';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [TeamsModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysRepository],
  exports: [ApiKeysService, ApiKeysRepository],
})
export class ApiKeysModule {}






