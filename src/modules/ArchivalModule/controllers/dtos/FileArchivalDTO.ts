import { IsArray, IsIn, IsString, IsUrl } from 'class-validator'

export class FileArchivalDTO {
    @IsString()
    @IsIn(['staging-data-invoicebutler'])
    bucket!: string

    @IsString()
    filePath!: string

    @IsString()
    @IsUrl()
    @IsArray({ each: true })
    webhooks?: string[]
}