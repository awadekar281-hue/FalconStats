import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetMappingService } from './asset-mapping.service';
import { AssetRepository } from './asset.repository';
import { ProvidersModule } from '../providers/providers.module';
import { CacheModule } from '../cache/cache.module';

@Module({ imports:[ProvidersModule,CacheModule], controllers: [AssetsController], providers: [AssetRepository, AssetMappingService], exports: [AssetRepository, AssetMappingService] })
export class AssetsModule {}
