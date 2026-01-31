import { IsString, IsObject } from 'class-validator';

export class IceCandidateDto {
  @IsString()
  roomId: string;

  @IsObject()
  candidate: RTCIceCandidateInit;
}
