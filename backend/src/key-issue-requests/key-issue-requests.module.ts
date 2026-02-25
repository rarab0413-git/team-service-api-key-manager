import { Module, forwardRef } from '@nestjs/common';
import { KeyIssueRequestsController } from './key-issue-requests.controller';
import { KeyIssueRequestsService } from './key-issue-requests.service';
import { KeyIssueRequestsRepository } from './key-issue-requests.repository';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => ApiKeysModule),
  ],
  controllers: [KeyIssueRequestsController],
  providers: [KeyIssueRequestsService, KeyIssueRequestsRepository],
  exports: [KeyIssueRequestsService, KeyIssueRequestsRepository],
})
export class KeyIssueRequestsModule {}
