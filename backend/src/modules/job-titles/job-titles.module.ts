import { Module } from '@nestjs/common';
import { AdminJobTitlesController } from './admin-job-titles.controller.js';
import { JobTitlesRepository } from './job-titles.repository.js';
import { JobTitlesService } from './job-titles.service.js';

@Module({
  controllers: [AdminJobTitlesController],
  providers: [JobTitlesService, JobTitlesRepository],
})
export class JobTitlesModule {}
