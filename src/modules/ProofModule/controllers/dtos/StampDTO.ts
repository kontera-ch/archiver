import { ArrayMinSize, IsArray, IsHexadecimal, IsUrl, IsUUID } from 'class-validator';

export class StampDTO {
  @IsHexadecimal()
  hash!: string;

  @IsUUID()
  fileId!: string

  @IsUrl({ }, { each: true })
  @IsArray()
  @ArrayMinSize(0)
  webhooks: string[] = []
}
