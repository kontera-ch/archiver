import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArchivalModule } from './modules/ArchivalModule/ArchivalModule';
import { GoogleCloudModule } from './modules/GoogleCloud/GoogleCloudModule';
import { GoogleSecretsConfigService } from './modules/GoogleCloud/services/GoogleSecretsConfigService';
import { TerminusModule } from '@nestjs/terminus';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: process.env.GOOGLE_SECRET_RESOURCE_ID ? [async () => GoogleSecretsConfigService.readGoogleSecrets()] : []
    }),
    TerminusModule,
    ArchivalModule,
    GoogleCloudModule
  ]
})
export class AppModule {}
