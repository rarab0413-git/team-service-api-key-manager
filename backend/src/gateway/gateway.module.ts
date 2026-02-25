import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { TeamsModule } from '../teams/teams.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [ApiKeysModule, TeamsModule, UsageModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}






