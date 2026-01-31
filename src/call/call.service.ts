import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface Room {
  id: string;
  users: Map<string, { odId: string; email: string; socketId: string }>;
}

@Injectable()
export class CallService {
  private rooms = new Map<string, Room>();

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
    user: { odId: string; email: string; socketId: string },
  ): { success: boolean; roomId: string; error?: string } {
    if (!roomId) {
      // Create new room for caller
      const newRoomId = this.createRoom();
      const room = this.rooms.get(newRoomId)!;
      room.users.set(user.socketId, user);
      return { success: true, roomId: newRoomId };
    }

    // Join existing room
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

  getOtherUser(
    roomId: string,
    socketId: string,
  ): { odId: string; email: string; socketId: string } | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    for (const [key, user] of room.users.entries()) {
      if (key !== socketId) {
        return user;
      }
    }
    return undefined;
  }
}
