// src/auth/auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {
  @ApiProperty({ description: '이메일', example: 'success@naver.com' })
  email: string;

  @ApiProperty({ description: '비밀번호', example: '123' })
  password: string;
}