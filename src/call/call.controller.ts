import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { CallService } from './call.service';
import { CreateCallResultDto } from './dto/call-result.dto';
import { SendCheerDto } from './dto/send-cheer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger'; // 1. ApiBearerAuth 추가

@ApiTags('통화 및 응원 (Call)')
@ApiBearerAuth() // 2. 여기에 반드시 추가해야 Swagger에서 토큰을 실어 보냅니다!
@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  /**
   * 1. 통화 종료 후 상세 결과 저장
   */
  @UseGuards(JwtAuthGuard)
  @Post('result')
  @ApiOperation({ summary: '통화 상세 결과 저장' })
  async saveCallResult(@Request() req: any, @Body() dto: CreateCallResultDto) {
    return this.callService.saveResult(req.user.id, dto);
  }

  /**
   * 2. 통화 종료 후 상대방에게 응원 메시지 발송
   */
  @UseGuards(JwtAuthGuard)
  @Post('cheer')
  @ApiOperation({ summary: '상대방에게 응원 메시지 발송' })
  async sendCheerMessage(@Request() req: any, @Body() dto: SendCheerDto) {
    return this.callService.saveCheerMessage(req.user.id, dto);
  }

  /**
   * 3. 받은 응원 메시지 목록 조회
   */
  @UseGuards(JwtAuthGuard)
  @Get('cheer-list')
  @ApiOperation({ summary: '내가 받은 응원 메시지 목록 조회' })
  async getMyCheers(@Request() req: any) {
    return this.callService.getReceivedCheers(req.user.id);
  }

  /**
   * 6. 금연 지속 시간 조회 (일, 시간, 분)
   */
  @UseGuards(JwtAuthGuard)
  @Get('smoking-duration')
  @ApiOperation({ summary: '금연 지속 시간 조회 (일, 시간, 분)' })
  async getSmokingDuration(@Request() req: any) {
    return this.callService.getSmokingDuration(req.user.id);
  }

  /**
   * 7. 금연 시작일 초기화 (실패 시 리셋)
   */
  @UseGuards(JwtAuthGuard)
  @Post('smoking-reset')
  @ApiOperation({ summary: '금연 시작일 초기화 (리셋)' })
  async resetSmokingDate(@Request() req: any) {
    return this.callService.resetSmokingStartDate(req.user.id);
  }
}