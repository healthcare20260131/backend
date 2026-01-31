import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], // 1. DB 연결 모듈 가져오기
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 2. AuthModule이 쓸 수 있게 내보내기
})
export class UsersModule {}