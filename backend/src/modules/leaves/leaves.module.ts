import { Module } from '@nestjs/common';
import { LeavesController } from './leaves.controller.js';
import { LeavesRepository } from './leaves.repository.js';
import { LeavesService } from './leaves.service.js';

@Module({
  controllers: [LeavesController],
  providers: [LeavesService, LeavesRepository],
})
export class LeavesModule {}
