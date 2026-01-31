import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';
import { CallController } from './call.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AuthModule, 
    PrismaModule
  ],
  controllers: [CallController],
  providers: [CallService, CallGateway],
})
export class CallModule {}