import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsController } from './analytics.controller';
@Module({imports:[DatabaseModule],controllers:[AnalyticsController]})
export class AnalyticsModule{}
