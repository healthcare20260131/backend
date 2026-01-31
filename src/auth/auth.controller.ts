import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() req) {
    return this.authService.signup(req);
  }

  @Post('login')
  async login(@Body() req) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('이메일이나 비밀번호가 틀렸습니다.');
    }
    return this.authService.login(user);
  }
}