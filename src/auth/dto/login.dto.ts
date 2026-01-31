import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'success@naver.com', description: '로그인 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '비밀번호' })
  @IsString()
  @MinLength(6)
  password: string;
}