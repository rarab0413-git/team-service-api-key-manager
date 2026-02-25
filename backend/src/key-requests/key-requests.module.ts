import { Module } from '@nestjs/common';
import { KeyRequestsController } from './key-requests.controller';
import { KeyRequestsService } from './key-requests.service';
import { KeyRequestsRepository } from './key-requests.repository';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ApiKeysModule, UsersModule],
  controllers: [KeyRequestsController],
  providers: [KeyRequestsService, KeyRequestsRepository],
  exports: [KeyRequestsService],
})
export class KeyRequestsModule {}
