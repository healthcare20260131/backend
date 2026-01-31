import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

// Q1. 통화 후 기분 상태 선택지
export enum CallMoodFeedback {
  MUCH_BETTER = 'MUCH_BETTER',         // 많이 진정됐어요
  SLIGHTLY_BETTER = 'SLIGHTLY_BETTER', // 조금 나아졌어요
  SAME = 'SAME',                       // 비슷해요
  STILL_DIFFICULT = 'STILL_DIFFICULT', // 아직 힘들어요
}

export class CallFeedbackDto {
  @ApiProperty({ 
    description: '통화 후 기분 상태', 
    enum: CallMoodFeedback, 
    example: CallMoodFeedback.MUCH_BETTER 
  })
  @IsEnum(CallMoodFeedback)
  mood: CallMoodFeedback;
}