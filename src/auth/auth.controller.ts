// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './auth.dto'; 

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')

  async signup(@Body() body: AuthDto) { 
    return this.authService.signup(body);
  }

  @Post('login')
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('이메일이나 비밀번호가 틀렸습니다.');
    }
    return this.authService.login(user);
  }
}