import { IsString, IsObject } from 'class-validator';

export class OfferDto {
  @IsString()
  roomId: string;

  @IsObject()
  sdp: RTCSessionDescriptionInit;
}
