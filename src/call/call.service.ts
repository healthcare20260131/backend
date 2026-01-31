import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CallFeedbackDto } from './dto/call-feedback.dto';
import { CreateCallResultDto } from './dto/call-result.dto';
import { SendCheerDto } from './dto/send-cheer.dto';

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
   * 1. 통화 상세 결과 저장
   * upsert를 활용해 부모(CallLog)가 없을 경우 자동 생성하여 500 에러 방지
   */
  async saveResult(userId: number, dto: CreateCallResultDto) {
    // CallLog가 없으면 생성, 있으면 그대로 둠
    await this.prisma.callLog.upsert({
      where: { id: dto.callLogId },
      update: {},
      create: {
        id: dto.callLogId,
        user1Id: userId,
        user2Id: userId, // 임시로 본인 ID 연결
      },
    });

    return this.prisma.callResult.create({
      data: {
        userId: userId,
        callLogId: dto.callLogId,
        callDuration: dto.callDuration,
        opponentName: dto.opponentName,
        mood: dto.mood,
      },
    });
  }

  /**
   * 2. 응원 메시지 따로 저장
   */
  async saveCheerMessage(senderId: number, dto: SendCheerDto) {
    // [보완] CallLog가 없으면 자동 생성
    await this.prisma.callLog.upsert({
      where: { id: dto.callLogId },
      update: {},
      create: {
        id: dto.callLogId,
        user1Id: senderId,
        user2Id: dto.receiverId,
      },
    });

    return this.prisma.cheerMessage.create({
      data: {
        callLogId: dto.callLogId,
        senderId: senderId,
        receiverId: dto.receiverId, 
        content: dto.content,
        senderName: dto.senderName,
      },
    });
  }

  /**
   * 3. 받은 응원 메시지 목록 조회
   */
  async getReceivedCheers(userId: number) {
    return this.prisma.cheerMessage.findMany({
      where: { receiverId: userId },
      orderBy: { receivedDate: 'desc' },
      select: {
        id: true,
        content: true,
        senderName: true,
        receivedDate: true,
      },
    });
  }

  /**
   * 4. 나의 통화 히스토리 조회
   */
  async getCallHistory(userId: number) {
    return this.prisma.callResult.findMany({
      where: { userId: userId },
      orderBy: { callDate: 'desc' },
      select: {
        id: true,
        opponentName: true,
        callDuration: true,
        mood: true,
        callDate: true,
      },
    });
  }

  /**
 * 5. 누적 통화(노담) 횟수 조회
 */
async getCallCount(userId: number) {
  const count = await this.prisma.callResult.count({
    where: { userId: userId },
  });
  
  return { totalNoDamCount: count };
}

  /**
   * 통화 후 기분 피드백 저장
   */
  async saveCallFeedback(userId: number, dto: CallFeedbackDto) {
    return this.prisma.survey.create({
      data: {
        user: { connect: { id: userId } },
        data: {
          type: 'CALL_FEEDBACK',
          mood: dto.mood,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * 6. 금연 지속 시간 계산 (일, 시간, 분)
   */
  async getSmokingDuration(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { smokingStartDate: true },
    });

    if (!user || !user.smokingStartDate) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const now = new Date();
    const startDate = new Date(user.smokingStartDate);
    const diffMs = now.getTime() - startDate.getTime(); // 밀리초 차이

    // 시간 계산 (객관적 수치)
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

    return { days, hours, minutes };
  }

  /**
   * 7. 금연 시작일 초기화 (실패 시 리셋)
   */
  async resetSmokingStartDate(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { smokingStartDate: new Date() }, // 현재 시간으로 리셋
    });
  }

  // --- WebRTC 룸 관리 로직 ---
  createRoom(): string {
    const roomId = randomUUID();
    this.rooms.set(roomId, { id: roomId, users: new Map() });
    return roomId;
  }

  joinRoom(roomId: string | undefined, user: UserInfo) {
    if (!roomId) {
      const newRoomId = this.createRoom();
      const room = this.rooms.get(newRoomId)!;
      room.users.set(user.socketId, user);
      return { success: true, roomId: newRoomId };
    }
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, roomId: '', error: 'Room not found' };
    if (room.users.size >= 2) return { success: false, roomId: '', error: 'Room is full' };
    room.users.set(user.socketId, user);
    return { success: true, roomId };
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socketId);
      if (room.users.size === 0) this.rooms.delete(roomId);
    }
  }

  getRoom(roomId: string) { return this.rooms.get(roomId); }

  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  // 대기 중인 room (1명만 있는) 찾기
  findAvailableRoom(): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.users.size === 1) {
        return room;
      }
    }
    return undefined;
  }

  // 자동 매칭: 대기 room 있으면 참가, 없으면 생성
  autoMatch(user: UserInfo): { success: boolean; roomId: string; isCreator: boolean } {
    const availableRoom = this.findAvailableRoom();

    if (availableRoom) {
      availableRoom.users.set(user.socketId, user);
      return { success: true, roomId: availableRoom.id, isCreator: false };
    }

    const newRoomId = this.createRoom();
    const room = this.rooms.get(newRoomId)!;
    room.users.set(user.socketId, user);
    return { success: true, roomId: newRoomId, isCreator: true };
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.users.has(socketId)) return room;
    }
    return undefined;
  }

  getOtherUser(roomId: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    for (const [key, user] of room.users.entries()) {
      if (key !== socketId) return user;
    }
    return undefined;
  }
}