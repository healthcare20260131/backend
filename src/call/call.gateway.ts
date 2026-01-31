import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CallGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

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
}
