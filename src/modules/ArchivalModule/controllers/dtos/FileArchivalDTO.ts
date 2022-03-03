import { IsArray, IsIn, IsString, IsUrl, IsUUID } from 'class-validator'

export class FileArchivalDTO {
    @IsString()
    @IsIn(['staging-data-invoicebutler'])
    bucket!: string

    @IsString()
    filePath!: string

    @IsUUID()
    fileId!: string

    @IsString()
    @IsUrl()
    @IsArray({ each: true })
    webhooks: string[] = []
}