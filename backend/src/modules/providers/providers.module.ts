import { Module } from '@nestjs/common';
import { ProviderClients } from './provider-clients.service';
import { ProviderRegistryService } from './provider-registry.service';
import { DatabaseModule } from '../database/database.module';

@Module({ imports:[DatabaseModule], providers: [ProviderClients, ProviderRegistryService], exports: [ProviderClients, ProviderRegistryService] })
export class ProvidersModule {}
