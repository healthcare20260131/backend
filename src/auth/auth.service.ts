import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 로그인 시 사용자 확인
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 로그인 토큰 발급 및 온보딩 상태 반환
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    
    // 유저의 최신 상태를 DB에서 다시 한 번 확인
    const currentUser = await this.usersService.findOne(user.email);

    return {
      access_token: this.jwtService.sign(payload),
      // 프론트엔드에서 로그인 즉시 화면 이동을 결정할 수 있도록 추가
      isOnboarded: currentUser?.isOnboarded ?? false,
    };
  }

  // 회원가입
  async signup(data: any) {
    return this.usersService.createUser(data);
  }
}