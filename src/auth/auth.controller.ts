// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto'; 
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('인증 (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입', description: '새로운 유저를 생성합니다.' })
  async signup(@Body() body: AuthDto) { 
    return this.authService.signup(body);
  }

  @Post('login')
  @ApiOperation({ 
    summary: '로그인', 
    description: '이메일과 비밀번호를 확인하여 토큰과 온보딩 완료 여부(isOnboarded)를 반환합니다.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: '로그인 성공',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR...',
        isOnboarded: false
      }
    }
  })
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('이메일이나 비밀번호가 틀렸습니다.');
    }
    // 서비스에서 수정된 login 메서드가 호출되어 { access_token, isOnboarded }가 반환됨.
    return this.authService.login(user);
  }
}