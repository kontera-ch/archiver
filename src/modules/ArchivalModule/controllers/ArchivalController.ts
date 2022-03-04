import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { FileArchivalDTO } from './dtos/FileArchivalDTO';
import { StampQueueService } from '../services/StampQueueService';
import { StampDTO } from './dtos/StampDTO';
import { ArchiveQueueService } from '../services/ArchiveQueueService';

@Controller('/api/archiver')
export class ArchivalController {
  constructor(private readonly googleCloudStorageService: GoogleCloudStorageService, private readonly stampQueueService: StampQueueService, private readonly archiveQueueService: ArchiveQueueService) {}

  @Post('stamp')
  async stamp(@Body() stampDTO: StampDTO) {
    this.stampQueueService.schedule(stampDTO)

    return {
      proof: {
        status: 'pending'
      }
    }
  }

  @Post('archive')
  async archiveBucketFile(@Body() fileArchivalDTO: FileArchivalDTO) {
    await this.archiveQueueService.schedule(fileArchivalDTO)
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
