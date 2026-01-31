// src/survey/survey.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './create-survey.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('설문조사 (Survey)')
@ApiBearerAuth()
@Controller('survey')
export class SurveyController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: '설문조사 제출', description: '설문 결과를 JSON으로 저장합니다.' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createSurvey(@Request() req, @Body() body: CreateSurveyDto) {
    return this.prisma.survey.create({
      data: {
        userId: req.user.id,
        data: body as any,
      },
    });
  }
}