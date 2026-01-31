# WebRTC 1:1 영상통화 - 프론트엔드 구현 가이드

> **NOTE**: 이 문서는 구현 플랜이 아닌 **가이드 문서**입니다.
> 프론트엔드 구현을 위한 참조 자료로 사용하세요.

## Overview

백엔드 시그널링 서버와 연동하여 1:1 WebRTC 영상통화를 구현하는 프론트엔드 가이드입니다.

---

## 아키텍처

```
┌─────────────────┐         ┌─────────────────┐
│   Browser A     │         │   Browser B     │
│  (Caller)       │         │  (Callee)       │
├─────────────────┤         ├─────────────────┤
│ MediaStream     │◄───────►│ MediaStream     │
│ RTCPeerConn.    │  Media  │ RTCPeerConn.    │
│ Socket.IO       │         │ Socket.IO       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │      Signaling            │
         │    (WebSocket)            │
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────┴──────┐
              │ NestJS      │
              │ Signaling   │
              │ Server      │
              └─────────────┘
```

---

## 필수 의존성

### React/Next.js

```bash
npm install socket.io-client
# or
bun add socket.io-client
```

### Vue.js

```bash
npm install socket.io-client
```

### 타입 정의 (TypeScript)

```typescript
// types/webrtc.ts

interface RoomResponse {
  roomId: string;
  success: boolean;
  error?: string;
}

interface SignalingMessage {
  roomId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface UserJoinedEvent {
  odId: string;
  email: string;
  socketId: string;
}
```

---

## 핵심 구현 포인트

### 1. Socket.IO 연결 (JWT 인증)

```typescript
import { io, Socket } from 'socket.io-client';

const connectToSignaling = (token: string): Socket => {
  const socket = io('http://localhost:3000', {
    auth: {
      token: token, // JWT 토큰
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Signaling server connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection failed:', error.message);
  });

  return socket;
};
```

### 2. WebRTC PeerConnection 설정

```typescript
const createPeerConnection = (): RTCPeerConnection => {
  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const pc = new RTCPeerConnection(config);

  pc.oniceconnectionstatechange = () => {
    console.log('ICE state:', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
  };

  return pc;
};
```

### 3. 미디어 스트림 획득

```typescript
const getLocalStream = async (): Promise<MediaStream> => {
  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
    audio: true,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  return stream;
};
```

### 4. 시그널링 플로우

#### Caller (발신자)

```typescript
const startCall = async (socket: Socket, pc: RTCPeerConnection) => {
  // 1. Room 생성
  socket.emit('create-room', {}, (response: RoomResponse) => {
    if (!response.success) {
      console.error('Room creation failed:', response.error);
      return;
    }

    const roomId = response.roomId;
    console.log('Room created:', roomId);

    // 2. 상대방이 들어오면 Offer 생성
    socket.on('user-joined', async (user: UserJoinedEvent) => {
      console.log('User joined:', user.email);

      // 3. Offer 생성 및 전송
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('offer', {
        roomId,
        sdp: offer,
      });
    });

    // 4. Answer 수신
    socket.on('answer', async (data: SignalingMessage) => {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp!));
    });
  });
};
```

#### Callee (수신자)

```typescript
const joinCall = async (
  socket: Socket,
  pc: RTCPeerConnection,
  roomId: string,
) => {
  // 1. Room 참가
  socket.emit('join-room', { roomId }, (response: RoomResponse) => {
    if (!response.success) {
      console.error('Join failed:', response.error);
      return;
    }

    console.log('Joined room:', roomId);

    // 2. Offer 수신 시 Answer 생성
    socket.on('offer', async (data: SignalingMessage) => {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp!));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        roomId,
        sdp: answer,
      });
    });
  });
};
```

### 5. ICE Candidate 교환

```typescript
const setupIceExchange = (
  socket: Socket,
  pc: RTCPeerConnection,
  roomId: string,
) => {
  // Local ICE candidate 전송
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        roomId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  // Remote ICE candidate 수신
  socket.on('ice-candidate', (data: SignalingMessage) => {
    if (data.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });
};
```

### 6. Remote Stream 처리

```typescript
const setupRemoteStream = (
  pc: RTCPeerConnection,
  videoElement: HTMLVideoElement,
) => {
  pc.ontrack = (event) => {
    console.log('Remote track received:', event.track.kind);

    if (videoElement.srcObject !== event.streams[0]) {
      videoElement.srcObject = event.streams[0];
      console.log('Remote stream attached');
    }
  };
};
```

---

## 시그널링 이벤트 목록

### Client → Server

| Event           | Payload                 | Response              |
| --------------- | ----------------------- | --------------------- |
| `create-room`   | `{}`                    | `{ roomId, success }` |
| `join-room`     | `{ roomId }`            | `{ success, error? }` |
| `leave-room`    | `{ roomId }`            | -                     |
| `offer`         | `{ roomId, sdp }`       | -                     |
| `answer`        | `{ roomId, sdp }`       | -                     |
| `ice-candidate` | `{ roomId, candidate }` | -                     |

### Server → Client

| Event           | Payload                     | Description            |
| --------------- | --------------------------- | ---------------------- |
| `user-joined`   | `{ odId, email, socketId }` | 상대방이 room에 입장   |
| `user-left`     | `{ odId, email }`           | 상대방이 room에서 퇴장 |
| `offer`         | `{ roomId, sdp }`           | Offer SDP 수신         |
| `answer`        | `{ roomId, sdp }`           | Answer SDP 수신        |
| `ice-candidate` | `{ roomId, candidate }`     | ICE candidate 수신     |
| `error`         | `{ code, message }`         | 에러 발생              |

---

## 에러 코드

| Code              | Message                    | 원인                              |
| ----------------- | -------------------------- | --------------------------------- |
| `ROOM_NOT_FOUND`  | Room does not exist        | 존재하지 않는 roomId로 참가 시도  |
| `ROOM_FULL`       | Room is full (max 2 users) | 이미 2명인 room에 참가 시도       |
| `UNAUTHORIZED`    | Invalid or expired token   | JWT 인증 실패                     |
| `ALREADY_IN_ROOM` | User is already in a room  | 이미 다른 room에 있는데 참가 시도 |
| `INTERNAL_ERROR`  | Internal server error      | 서버 내부 오류                    |

---

## React Hook 예시

```typescript
// hooks/useWebRTC.ts
import { useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: string;
  connect: (token: string) => void;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  hangUp: () => void;
}

export const useWebRTC = (): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const connect = useCallback(async (token: string) => {
    // 1. Get local stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    // 2. Connect to signaling server
    const socket = io('http://localhost:3000', {
      auth: { token },
    });
    socketRef.current = socket;

    // 3. Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    // Setup signaling handlers
    setupSignalingHandlers(socket, pc);

    setConnectionState('connected');
  }, []);

  const createRoom = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('create-room', {}, (response: any) => {
        if (response.success) {
          roomIdRef.current = response.roomId;
          setupCallerFlow();
          resolve(response.roomId);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const joinRoom = useCallback(async (roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('join-room', { roomId }, (response: any) => {
        if (response.success) {
          roomIdRef.current = roomId;
          setupCalleeFlow();
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  const hangUp = useCallback(() => {
    // Cleanup
    localStream?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    socketRef.current?.emit('leave-room', { roomId: roomIdRef.current });
    socketRef.current?.disconnect();

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('disconnected');
  }, [localStream]);

  // ... helper functions (setupSignalingHandlers, setupCallerFlow, setupCalleeFlow)

  return {
    localStream,
    remoteStream,
    connectionState,
    connect,
    createRoom,
    joinRoom,
    hangUp,
  };
};
```

---

## UI 컴포넌트 예시

```tsx
// components/VideoCall.tsx
import { useWebRTC } from '../hooks/useWebRTC';
import { useRef, useEffect, useState } from 'react';

export const VideoCall = () => {
  const {
    localStream,
    remoteStream,
    connectionState,
    connect,
    createRoom,
    joinRoom,
    hangUp,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState('');

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-call-container">
      <div className="status">Status: {connectionState}</div>

      {/* Auth */}
      <input
        type="text"
        placeholder="JWT Token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <button onClick={() => connect(token)}>Connect</button>

      {/* Room Controls */}
      <div className="room-controls">
        <button
          onClick={async () => {
            const id = await createRoom();
            setRoomId(id);
          }}
        >
          Create Room
        </button>

        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={() => joinRoom(roomId)}>Join Room</button>
      </div>

      {/* Video Elements */}
      <div className="videos">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="local-video"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="remote-video"
        />
      </div>

      {/* Hang Up */}
      <button onClick={hangUp} className="hangup-btn">
        Hang Up
      </button>
    </div>
  );
};
```

---

## 주의사항

### 1. HTTPS 필요 (프로덕션)

```
getUserMedia()는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작합니다.
```

### 2. 브라우저 호환성

- Chrome 74+
- Firefox 66+
- Safari 14.1+
- Edge 79+

### 3. TURN 서버 (프로덕션)

POC에서는 STUN만 사용하지만, 프로덕션에서는 TURN 서버 필요:

```typescript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'password',
    },
  ],
};
```

### 4. Socket.IO 버전 매칭

백엔드의 socket.io 버전과 클라이언트 버전을 맞춰야 합니다:

```json
// Backend: @nestjs/platform-socket.io uses socket.io v4.x
// Frontend: socket.io-client v4.x
```

---

## 다음 단계 (프로덕션 확장)

1. **TURN 서버 설정** - coturn 또는 Twilio TURN
2. **에러 핸들링 강화** - 재연결 로직, 타임아웃
3. **UI/UX 개선** - 로딩 상태, 알림, 통화 컨트롤
4. **보안 강화** - Token refresh, Rate limiting
5. **통화 품질 모니터링** - WebRTC stats API 활용
