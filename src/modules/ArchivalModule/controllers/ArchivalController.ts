import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { FileArchivalDTO } from './dtos/FileArchivalDTO';
import { ArchiveQueueService } from '../services/ArchiveQueueService';
import { ConfigService } from '@nestjs/config';
import { JobResponseObject } from '@/modules/PgBossModule/services/PgBossConsumerService';

@Controller('/api/archiver')
export class ArchivalController {
  constructor(private configService: ConfigService, private readonly googleCloudStorageService: GoogleCloudStorageService, private readonly archiveQueueService: ArchiveQueueService) {}

  @Post('archive')
  async archiveBucketFile(@Body() fileArchivalDTO: FileArchivalDTO) {
    await this.archiveQueueService.schedule(fileArchivalDTO)
  }

  @Post('archive/flush')
  async fetchArchiveJobs() {
    const archiveQueueConcurrency = parseInt(this.configService.get('ARCHIVE_QUEUE_BATCH_SIZE', '5'))
    const jobResponses: JobResponseObject[] = []

    for (let i = 0; i < archiveQueueConcurrency; i++) {
      jobResponses.push(...await this.archiveQueueService.fetch())
    }

    return {
      queue: this.archiveQueueService.queueName,
      completed: jobResponses.length,
      success: jobResponses.filter(job => job.success === true).length,
      failed: jobResponses.filter(job => job.success === false).length
    }
  }

  @Get('state/:hash')
  async state(@Param('hash') hash: string) {
    const archivedFile = await this.googleCloudStorageService.archiver.state(hash)
    const archivedProof = await this.googleCloudStorageService.archiver.proof(hash)

    return {
      file: archivedFile,
      proof: archivedProof
    }
  }
}
