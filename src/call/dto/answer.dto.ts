import { IsString, IsObject } from 'class-validator';

export class AnswerDto {
  @IsString()
  roomId: string;

  @IsObject()
  sdp: RTCSessionDescriptionInit;
}
