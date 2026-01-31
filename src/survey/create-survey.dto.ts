// src/survey/create-survey.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  ValidateIf, 
  IsNotEmpty, 
  IsDateString, 
  IsInt, 
  Min 
} from 'class-validator';

// Q1. 금연 이유 선택지
export enum QuitReason {
  HEALTH = 'HEALTH',   // 건강
  FAMILY = 'FAMILY',   // 가족
  FITNESS = 'FITNESS', // 체력
  MONEY = 'MONEY',     // 돈
  ETC = 'ETC',         // 기타
}

export class CreateSurveyDto {
  // === Q1. 금연 이유 ===
  @ApiProperty({ description: '금연하려는 이유', enum: QuitReason, example: 'HEALTH' })
  @IsEnum(QuitReason)
  quitReason: QuitReason;

  @ApiProperty({ description: '기타 사유', example: '냄새가 나서', required: false })
  @ValidateIf(o => o.quitReason === QuitReason.ETC) // ETC일 때만 검사
  @IsString()
  @IsNotEmpty()
  quitReasonEtc?: string;

  // === Q2. 금연 시작일 ===
  @ApiProperty({ description: '금연 시작일 (YYYY-MM-DD)', example: '2026-01-01' })
  @IsDateString({}, { message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }) 
  quitDate: string;

  // === Q3. 흡연 기간 (년) ===
  @ApiProperty({ description: '흡연 기간 (년)', example: 5 })
  @IsInt({ message: '정수(년)로 입력해주세요.' })
  @Min(0)
  smokingYears: number;

  // === Q4. 하루 흡연량 (개비) ===
  @ApiProperty({ description: '하루 평균 흡연량 (개비)', example: 10 })
  @IsInt({ message: '정수(개비)로 입력해주세요.' })
  @Min(1)
  dailyCigarettes: number;

  // === Q5. 한 갑당 개비 수 ===
  @ApiProperty({ description: '한 갑에 들어있는 개비 수 (보통 20)', example: 20 })
  @IsInt({ message: '정수(개비)로 입력해주세요.' })
  @Min(1)
  packSize: number;
}