import { Module } from '@nestjs/common';
import { SurveyController } from './survey.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SurveyController],
})
export class SurveyModule {} 