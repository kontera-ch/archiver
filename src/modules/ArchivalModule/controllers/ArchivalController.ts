import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ArchivalService } from '@/modules/ArchivalModule/services/ArchivalService';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { FileArchivalDTO } from './dtos/FileArchivalDTO';
import { createHash } from 'crypto'
import axios from 'axios'

@Controller('/api/archiver')
export class ArchivalController {
  constructor(private readonly archivalService: ArchivalService, private readonly googleCloudStorageService: GoogleCloudStorageService) {}

  @Post('proof')
  async proofFile(@Body() fileArchivalDTO: FileArchivalDTO) {
    const file = await GoogleCloudStorageService.googleCloudStorageServiceForBucket(fileArchivalDTO.bucket).file(fileArchivalDTO.filePath)

    // hash the provided file using sha256
    const hashFunction = createHash('sha256')
    
    const sha256Hash: string = await new Promise((resolve, reject) => file.createReadStream().on('data', (data: any) => {
      hashFunction.update(data)
    }).on('end', () => {
      resolve(hashFunction.digest('hex'))
    }).on('error', (error) => {
      reject(error)
    }))

    // check if we have previously archived this very file (TODO: do we need to hash in the user id or something?)
    /*
    const isFileArchived = await this.googleCloudStorageService.archiver.exists(sha256Hash)

    if (isFileArchived) {
      return this.state(sha256Hash)
    }
    */

    // we have not, so lets stamp it
    this.archivalService.stamp(sha256Hash, { webhooks: fileArchivalDTO.webhooks })

    return {
      proof: {
        status: 'pending'
      }
    }
  }

  @Post('archive')
  async archiveBucketFile(@Body() fileArchivalDTO: FileArchivalDTO) {
    const file = await GoogleCloudStorageService.googleCloudStorageServiceForBucket(fileArchivalDTO.bucket).file(fileArchivalDTO.filePath)

    // hash the provided file using sha256
    const hashFunction = createHash('sha256')
    
    const sha256Hash: string = await new Promise((resolve, reject) => file.createReadStream().on('data', (data: any) => {
      hashFunction.update(data)
    }).on('end', () => {
      resolve(hashFunction.digest('hex'))
    }).on('error', (error) => {
      reject(error)
    }))

    // check if we have previously archived this very file (TODO: do we need to hash in the user id or something?)
    /*
    const isFileArchived = await this.googleCloudStorageService.archiver.exists(sha256Hash)

    if (isFileArchived) {
      return this.state(sha256Hash)
    }
    */

    // we have not, so lets stamp it

    const archivalFileState = await this.googleCloudStorageService.archiver.archiveFile(file, sha256Hash)

    await Promise.all(fileArchivalDTO.webhooks.map(async webhook => {
      return axios.post(webhook, { archivalFileState })
    }))

    return archivalFileState
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
