import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
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
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private callService: CallService,
  ) {}

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

  async handleConnection(socket: Socket) {}

  @SubscribeMessage('check-room')
  handleCheckRoom(
    @MessageBody() data: { roomId: string },
  ): { exists: boolean } {
    const exists = this.callService.roomExists(data.roomId);
    return { exists };
  }

  @SubscribeMessage('auto-match')
  handleAutoMatch(
    @ConnectedSocket() socket: Socket,
  ): { success: boolean; roomId: string; isCreator: boolean } {
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
    this.callService.leaveRoom(data.roomId, socket.id);
    socket.leave(data.roomId);
    socket.to(data.roomId).emit('user-left', {
      odId: socket.data.id,
      email: socket.data.email,
    });
  }

  handleDisconnect(socket: Socket) {
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
      socket.emit('error', { code: 'NO_PEER', message: 'No peer in room' });
      return;
    }

    // Relay offer to the other user
    this.server.to(otherUser.socketId).emit('offer', {
      sdp: data.sdp,
      from: { odId: socket.data.id, email: socket.data.email },
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AnswerDto,
  ): void {
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
      socket.emit('error', { code: 'NO_PEER', message: 'No peer in room' });
      return;
    }

    // Relay answer to the other user
    this.server.to(otherUser.socketId).emit('answer', {
      sdp: data.sdp,
      from: { odId: socket.data.id, email: socket.data.email },
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: IceCandidateDto,
  ): void {
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
  }
}
