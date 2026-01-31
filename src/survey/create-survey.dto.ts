import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsString, 
  IsNotEmpty, 
  ValidateIf 
} from 'class-validator';

/**
 * Q1. 금연 이유
 */
export enum QuitReason {
  HEALTH = 'HEALTH',   // 내 건강
  FAMILY = 'FAMILY',   // 내 가족
  FITNESS = 'FITNESS', // 더 나은 체력
  MONEY = 'MONEY',     // 돈 절약
  ETC = 'ETC',         // 직접 입력
}

/**
 * Q2. 금연 시점 (언제)
 */
export enum QuitWillPeriod {
  WITHIN_1W = 'WITHIN_1W',             // 1주일 내
  FROM_1W_TO_1M = 'FROM_1W_TO_1M',     // 1주일 이상 1개월 미만
  FROM_1M_TO_3M = 'FROM_1M_TO_3M',     // 1개월 이상 3개월 미만
  FROM_3M_TO_6M = 'FROM_3M_TO_6M',     // 3개월 이상 6개월 미만
  OVER_6M = 'OVER_6M',                 // 6개월 이상
}

/**
 * Q3. 흡연 형태
 */
export enum SmokingType {
  CIGARETTE = 'CIGARETTE', // 연초
  LIQUID = 'LIQUID',       // 액상
  STEAM = 'STEAM',         // 스팀
  CIGAR = 'CIGAR',         // 시가
  DEPENDS = 'DEPENDS',     // 상황에 따라 다름
}

/**
 * Q4. 총 흡연 기간
 */
export enum TotalSmokingPeriod {
  UNDER_3M = 'UNDER_3M',           // 3개월 미만
  FROM_3M_TO_6M = 'FROM_3M_TO_6M', // 3개월 이상 6개월 미만
  FROM_6M_TO_1Y = 'FROM_6M_TO_1Y', // 6개월 이상 1년 미만
  FROM_1Y_TO_3Y = 'FROM_1Y_TO_3Y', // 1년 이상 3년 미만
  OVER_3Y = 'OVER_3Y',             // 3년 이상
}

/**
 * Q5. 하루 평균 흡연량
 */
export enum DailySmokingAmount {
  AMT_1_5 = 'AMT_1_5',     // 1-5개비
  AMT_6_10 = 'AMT_6_10',   // 6-10개비
  AMT_11_15 = 'AMT_11_15', // 11-15개비
  OVER_16 = 'OVER_16',     // 16개비 이상
  UNKNOWN = 'UNKNOWN',     // 잘 모르겠다
}

/**
 * Q6. 하루 흡연 횟수
 */
export enum DailySmokingFrequency {
  FREQ_1_5 = 'FREQ_1_5',   // 1-5회
  FREQ_6_10 = 'FREQ_6_10', // 6-10
  FREQ_10_20 = 'FREQ_10_20', // 10-20
  OVER_20 = 'OVER_20',     // 20회 이상
  UNKNOWN = 'UNKNOWN',     // 잘 모르겠다
}

export class CreateSurveyDto {
  @ApiProperty({ description: 'Q1. 금연 이유', enum: QuitReason, example: QuitReason.HEALTH })
  @IsEnum(QuitReason)
  quitReason: QuitReason;

  @ApiProperty({ description: 'Q1-1. 직접 입력 사유', required: false, example: '냄새가 심해서' })
  @ValidateIf(o => o.quitReason === QuitReason.ETC)
  @IsString()
  @IsNotEmpty()
  quitReasonEtc?: string;

  @ApiProperty({ description: 'Q2. 금연 시점', enum: QuitWillPeriod, example: QuitWillPeriod.WITHIN_1W })
  @IsEnum(QuitWillPeriod)
  quitWillPeriod: QuitWillPeriod;

  @ApiProperty({ description: 'Q3. 흡연 형태', enum: SmokingType, example: SmokingType.CIGARETTE })
  @IsEnum(SmokingType)
  smokingType: SmokingType;

  @ApiProperty({ description: 'Q4. 총 흡연 기간', enum: TotalSmokingPeriod, example: TotalSmokingPeriod.FROM_1Y_TO_3Y })
  @IsEnum(TotalSmokingPeriod)
  totalSmokingPeriod: TotalSmokingPeriod;

  @ApiProperty({ description: 'Q5. 하루 평균 흡연량', enum: DailySmokingAmount, example: DailySmokingAmount.AMT_6_10 })
  @IsEnum(DailySmokingAmount)
  dailySmokingAmount: DailySmokingAmount;

  @ApiProperty({ description: 'Q6. 하루 흡연 횟수', enum: DailySmokingFrequency, example: DailySmokingFrequency.FREQ_10_20 })
  @IsEnum(DailySmokingFrequency)
  dailySmokingFrequency: DailySmokingFrequency;
}