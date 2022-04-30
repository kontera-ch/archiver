import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { StampQueueService } from '../services/StampQueueService';
import { StampDTO } from './dtos/StampDTO';
import { ConfigService } from '@nestjs/config';

@Controller('/api/proofs')
export class ProofController {
  constructor(private configService: ConfigService, private readonly googleCloudStorageService: GoogleCloudStorageService, private readonly stampQueueService: StampQueueService) {}

  @Post('stamp')
  async stamp(@Body() stampDTO: StampDTO) {
    this.stampQueueService.schedule(stampDTO);

    return {
      proof: {
        status: 'pending'
      }
    };
  }

  @Post('commit')
  async fetchStampJobs() {
    const stampQueueBatchSizte = parseInt(this.configService.get('STAMP_QUEUE_BATCH_SIZE', '100'));
    const jobResponses = await this.stampQueueService.fetchBatch(stampQueueBatchSizte);

    return {
      queue: this.stampQueueService.queueName,
      completed: jobResponses.length,
      success: jobResponses.filter((job) => job.success === true).length,
      failed: jobResponses.filter((job) => job.success === false).length
    };
  }

  @Get('state/:hash')
  async state(@Param('hash') hash: string) {
    const archivedFile = await this.googleCloudStorageService.archiver.state(hash);
    const archivedProof = await this.googleCloudStorageService.archiver.proof(hash);

    return {
      file: archivedFile,
      proof: archivedProof
    };
  }
}
