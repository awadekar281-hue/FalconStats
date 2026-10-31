import { Module } from '@nestjs/common';
import { CmcClient } from './cmc.client';
import { CmcTelemetryService } from './cmc-telemetry.service';

@Module({ providers: [CmcClient, CmcTelemetryService], exports: [CmcClient, CmcTelemetryService] })
export class CmcModule {}
