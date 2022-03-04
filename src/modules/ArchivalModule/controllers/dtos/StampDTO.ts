import { IsArray, IsString, IsUrl, IsUUID } from 'class-validator';

export class StampDTO {
  @IsString()
  hash!: string;

  @IsUUID()
  fileId!: string

  @IsString()
  @IsUrl()
  @IsArray({ each: true })
  webhooks: string[] = []
}
