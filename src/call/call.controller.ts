import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CallService } from './call.service';
import { CallFeedbackDto } from './dto/call-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Call')
@ApiBearerAuth()
@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '통화 후 기분 피드백 저장' })
  async saveFeedback(@Body() dto: CallFeedbackDto, @Req() req) {
    // req.user.id는 JwtAuthGuard가 토큰에서 추출해준 유저 ID입니다.
    return this.callService.saveCallFeedback(req.user.id, dto);
  }
}