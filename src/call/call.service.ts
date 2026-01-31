import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CallFeedbackDto } from './dto/call-feedback.dto';

interface UserInfo {
  odId: string;
  email: string;
  socketId: string;
}

interface Room {
  id: string;
  users: Map<string, UserInfo>;
}

@Injectable()
export class CallService {
  private rooms = new Map<string, Room>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 통화 후 기분 피드백 저장
   * Survey 테이블의 data 필드(JSON)에 CALL_FEEDBACK 타입으로 저장합니다.
   */
  async saveCallFeedback(userId: number, dto: CallFeedbackDto) {
    return this.prisma.survey.create({
      data: {
        userId: userId,
        data: {
          type: 'CALL_FEEDBACK',
          mood: dto.mood,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  createRoom(): string {
    const roomId = randomUUID();
    this.rooms.set(roomId, {
      id: roomId,
      users: new Map(),
    });
    return roomId;
  }

  joinRoom(
    roomId: string | undefined,
    user: UserInfo,
  ): { success: boolean; roomId: string; error?: string } {
    if (!roomId) {
      const newRoomId = this.createRoom();
      const room = this.rooms.get(newRoomId)!;
      room.users.set(user.socketId, user);
      return { success: true, roomId: newRoomId };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, roomId: '', error: 'Room not found' };
    }

    if (room.users.size >= 2) {
      return { success: false, roomId: '', error: 'Room is full' };
    }

    room.users.set(user.socketId, user);
    return { success: true, roomId };
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socketId);
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.users.has(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  getOtherUser(roomId: string, socketId: string): UserInfo | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    for (const [key, user] of room.users.entries()) {
      if (key !== socketId) return user;
    }
    return undefined;
  }
}