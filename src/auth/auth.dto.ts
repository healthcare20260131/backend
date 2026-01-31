// src/auth/auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthDto {
  @ApiProperty({ description: '이메일', example: 'success@naver.com' })
  @IsEmail({}, { message: '이메일 형식이 아닙니다.' }) 
  email: string;

  @ApiProperty({ description: '비밀번호', example: '123456' })
  @IsString()
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다.' }) 
  password: string;
}