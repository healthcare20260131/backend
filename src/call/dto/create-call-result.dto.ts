import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCallResultDto {
  @ApiProperty({ example: 1, description: '통화 로그 ID (CallLog 테이블 ID)' })
  @IsNumber()
  @IsNotEmpty()
  callLogId: number;

  @ApiProperty({ example: 120, description: '통화 시간 (초 단위)' })
  @IsNumber()
  @IsNotEmpty()
  callDuration: number;

  @ApiProperty({ example: '노담사랑꾼', description: '상대방 닉네임' })
  @IsString()
  @IsNotEmpty()
  opponentName: string;

  @ApiProperty({ example: 'Happy', description: '내가 선택한 기분' })
  @IsString()
  @IsNotEmpty()
  mood: string;
}