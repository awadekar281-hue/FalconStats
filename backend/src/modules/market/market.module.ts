import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketRepository } from './market.repository';
import { MarketService } from './market.service';

@Module({ controllers: [MarketController], providers: [MarketRepository, MarketService], exports: [MarketRepository, MarketService] })
export class MarketModule {}
