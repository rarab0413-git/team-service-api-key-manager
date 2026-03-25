import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TeamsModule } from './teams/teams.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UsageModule } from './usage/usage.module';
import { GatewayModule } from './gateway/gateway.module';
import { UsersModule } from './users/users.module';
import { KeyRequestsModule } from './key-requests/key-requests.module';
import { KeyIssueRequestsModule } from './key-issue-requests/key-issue-requests.module';
import { ManualRagModule } from './manual-rag/manual-rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TeamsModule,
    ApiKeysModule,
    UsageModule,
    GatewayModule,
    UsersModule,
    KeyRequestsModule,
    KeyIssueRequestsModule,
    ManualRagModule,
  ],
})
export class AppModule {}
