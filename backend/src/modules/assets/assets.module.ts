import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetMappingService } from './asset-mapping.service';
import { AssetRepository } from './asset.repository';

@Module({ controllers: [AssetsController], providers: [AssetRepository, AssetMappingService], exports: [AssetRepository, AssetMappingService] })
export class AssetsModule {}
