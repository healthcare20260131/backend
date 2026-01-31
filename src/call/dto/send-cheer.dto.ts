import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCheerDto {
  @ApiProperty({ example: 1, description: '통화 로그 ID' })
  @IsNumber()
  @IsNotEmpty()
  callLogId: number;

  @ApiProperty({ example: 5, description: '메시지를 받을 상대방의 User ID' })
  @IsNumber()
  @IsNotEmpty()
  receiverId: number;

  @ApiProperty({ example: '오늘 대화 즐거웠어요! 힘내세요!', description: '응원 내용' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  content: string;

  @ApiProperty({ example: '노담사랑꾼', description: '보내는 사람(나)의 닉네임' })
  @IsString()
  @IsNotEmpty()
  senderName: string;
}