// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 회원 찾기 (이메일로)
  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // 회원 가입 (비밀번호 암호화 포함)
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword, // 암호화된 비번 저장
      },
    });
  }
}