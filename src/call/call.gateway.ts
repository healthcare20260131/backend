import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { CallService } from './call.service';
import { OfferDto, AnswerDto, IceCandidateDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('WebSocket');

  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private callService: CallService,
  ) {}

  private parseSdpMedia(sdp?: string): {
    hasVideo: boolean;
    hasAudio: boolean;
  } {
    if (!sdp) return { hasVideo: false, hasAudio: false };
    return {
      hasVideo: sdp.includes('m=video'),
      hasAudio: sdp.includes('m=audio'),
    };
  }

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('No token provided'));
        }

        const payload = await this.jwtService.verifyAsync(token, {
          secret: 'SECRET_KEY',
        });

        socket.data = {
          id: payload.sub,
          email: payload.email,
        };
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  handleConnection(socket: Socket) {
    this.logger.log(`[CONNECT] socketId: ${socket.id}`);
  }

  @SubscribeMessage('check-room')
  handleCheckRoom(@MessageBody() data: { roomId: string }): {
    exists: boolean;
  } {
    this.logger.log(`[check-room] roomId: ${data.roomId}`);
    const exists = this.callService.roomExists(data.roomId);
    return { exists };
  }

  @SubscribeMessage('auto-match')
  handleAutoMatch(@ConnectedSocket() socket: Socket): {
    success: boolean;
    roomId: string;
    isCreator: boolean;
  } {
    this.logger.log(`[auto-match] socketId: ${socket.id}`);
    const result = this.callService.autoMatch({
      odId: socket.data.id,
      email: socket.data.email,
      socketId: socket.id,
    });

    socket.join(result.roomId);

    if (!result.isCreator) {
      // 기존 대기자에게 상대방 입장 알림
      socket.to(result.roomId).emit('user-joined', {
        odId: socket.data.id,
        email: socket.data.email,
      });
    }

    return result;
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId?: string },
  ): { success: boolean; roomId?: string; error?: string } {
    this.logger.log(
      `[join-room] socketId: ${socket.id}, roomId: ${data.roomId}`,
    );
    const result = this.callService.joinRoom(data.roomId, {
      odId: socket.data.id,
      email: socket.data.email,
      socketId: socket.id,
    });

    if (result.success) {
      socket.join(result.roomId);
      socket.to(result.roomId).emit('user-joined', {
        odId: socket.data.id,
        email: socket.data.email,
      });
    }

    return result;
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    this.logger.log(
      `[leave-room] socketId: ${socket.id}, roomId: ${data.roomId}`,
    );
    this.callService.leaveRoom(data.roomId, socket.id);
    socket.leave(data.roomId);
    socket.to(data.roomId).emit('user-left', {
      odId: socket.data.id,
      email: socket.data.email,
    });
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`[DISCONNECT] socketId: ${socket.id}`);
    const room = this.callService.getRoomBySocketId(socket.id);
    if (room) {
      socket.to(room.id).emit('user-left', {
        odId: socket.data.id,
        email: socket.data.email,
      });
      this.callService.leaveRoom(room.id, socket.id);
    }
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: OfferDto,
  ): void {
    const sdpInfo = this.parseSdpMedia(data.sdp?.sdp);
    this.logger.log(
      `[offer] from: ${socket.id} → roomId: ${data.roomId} | video: ${sdpInfo.hasVideo}, audio: ${sdpInfo.hasAudio}`,
    );

    const room = this.callService.getRoom(data.roomId);
    if (!room) {
      this.logger.warn(`[offer] FAILED - room not found: ${data.roomId}`);
      socket.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
      return;
    }

    const otherUser = this.callService.getOtherUser(data.roomId, socket.id);
    if (!otherUser) {
      this.logger.warn(`[offer] FAILED - no peer in room: ${data.roomId}`);
      socket.emit('error', { code: 'NO_PEER', message: 'No peer in room' });
      return;
    }

    // Relay offer to the other user
    this.server.to(otherUser.socketId).emit('offer', {
      sdp: data.sdp,
      from: { odId: socket.data.id, email: socket.data.email },
    });
    this.logger.log(`[offer] RELAYED → ${otherUser.socketId}`);
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AnswerDto,
  ): void {
    const sdpInfo = this.parseSdpMedia(data.sdp?.sdp);
    this.logger.log(
      `[answer] from: ${socket.id} → roomId: ${data.roomId} | video: ${sdpInfo.hasVideo}, audio: ${sdpInfo.hasAudio}`,
    );

    const room = this.callService.getRoom(data.roomId);
    if (!room) {
      this.logger.warn(`[answer] FAILED - room not found: ${data.roomId}`);
      socket.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
      return;
    }

    const otherUser = this.callService.getOtherUser(data.roomId, socket.id);
    if (!otherUser) {
      this.logger.warn(`[answer] FAILED - no peer in room: ${data.roomId}`);
      socket.emit('error', { code: 'NO_PEER', message: 'No peer in room' });
      return;
    }

    // Relay answer to the other user
    this.server.to(otherUser.socketId).emit('answer', {
      sdp: data.sdp,
      from: { odId: socket.data.id, email: socket.data.email },
    });
    this.logger.log(`[answer] RELAYED → ${otherUser.socketId}`);
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: IceCandidateDto,
  ): void {
    this.logger.debug(
      `[ice-candidate] from: ${socket.id}, roomId: ${data.roomId}`,
    );

    const room = this.callService.getRoom(data.roomId);
    if (!room) {
      socket.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
      return;
    }

    const otherUser = this.callService.getOtherUser(data.roomId, socket.id);
    if (!otherUser) {
      // ICE candidates may arrive before peer joins, silently ignore
      return;
    }

    // Relay ICE candidate to the other user
    this.server.to(otherUser.socketId).emit('ice-candidate', {
      candidate: data.candidate,
      from: { odId: socket.data.id, email: socket.data.email },
    });
    this.logger.debug(`[ice-candidate] RELAYED → ${otherUser.socketId}`);
  }
}
