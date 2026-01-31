// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 1. 헤더에서 Bearer 토큰 가져오기
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. 만료된 토큰은 거절
      ignoreExpiration: false,
      // 3. AuthModule과 같은 비밀키
      secretOrKey: 'SECRET_KEY', 
    });
  }

  async validate(payload: any) {
    // 요청한 사람의 정보 반환
    return { id: payload.sub, email: payload.email };
  }
}