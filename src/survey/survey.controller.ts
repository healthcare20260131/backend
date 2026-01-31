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

  @ApiOperation({
    summary: '설문조사 제출',
    description:
      '설문 결과를 저장하고 해당 유저의 온보딩 상태를 완료(true)로 변경합니다.',
  })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createSurvey(@Request() req, @Body() body: CreateSurveyDto) {
    // 설문 저장과 유저 정보 수정을 트랜잭션으로 묶어 처리합니다.
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 설문 데이터 생성
      const survey = await tx.survey.create({
        data: {
          userId: req.user.id,
          data: body as any,
        },
      });

      // 2. 유저의 isOnboarded 필드를 true로 업데이트
      const user = await tx.user.update({
        where: { id: req.user.id },
        data: { isOnboarded: true },
      });

      return { survey, isOnboarded: user.isOnboarded };
    });

    return {
      message: '설문 제출 및 온보딩이 완료되었습니다.',
      surveyId: result.survey.id,
      isOnboarded: result.isOnboarded, // true 반환
    };
  }
}
