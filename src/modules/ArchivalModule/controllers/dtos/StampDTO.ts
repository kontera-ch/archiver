import { IsString } from 'class-validator';

export class StampDTO {
  @IsString()
  hash!: string;
}
