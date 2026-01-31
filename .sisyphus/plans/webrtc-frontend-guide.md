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

  socket.on('connect', () => {});

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

  pc.oniceconnectionstatechange = () => {};

  pc.onconnectionstatechange = () => {};

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

    // 2. 상대방이 들어오면 Offer 생성
    socket.on('user-joined', async (user: UserJoinedEvent) => {
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

#### 단일 Connect 버튼 (권장) - 자동 매칭

버튼 하나로 대기 중인 room에 자동 매칭. 대기 room이 없으면 새로 생성:

```typescript
interface AutoMatchResponse {
  success: boolean;
  roomId: string;
  isCreator: boolean; // true: 대기 중 (Caller), false: 매칭됨 (Callee)
}

const autoMatch = async (socket: Socket, pc: RTCPeerConnection) => {
  socket.emit('auto-match', {}, (response: AutoMatchResponse) => {
    if (!response.success) {
      console.error('Auto match failed');
      return;
    }

    const { roomId, isCreator } = response;

    if (isCreator) {
      // Caller: 상대방 대기
      setupCallerFlow(socket, pc, roomId);
    } else {
      // Callee: 바로 연결 시작
      setupCalleeFlow(socket, pc, roomId);
    }
  });
};

// Caller: user-joined 이벤트 대기 후 Offer 전송
const setupCallerFlow = (
  socket: Socket,
  pc: RTCPeerConnection,
  roomId: string,
) => {
  socket.on('user-joined', async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { roomId, sdp: offer });
  });

  socket.on('answer', async (data: SignalingMessage) => {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp!));
  });
};

// Callee: Offer 수신 후 Answer 전송
const setupCalleeFlow = (
  socket: Socket,
  pc: RTCPeerConnection,
  roomId: string,
) => {
  socket.on('offer', async (data: SignalingMessage) => {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp!));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { roomId, sdp: answer });
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
    if (videoElement.srcObject !== event.streams[0]) {
      videoElement.srcObject = event.streams[0];
    }
  };
};
```

---

## 시그널링 이벤트 목록

### Client → Server

| Event           | Payload                 | Response                         |
| --------------- | ----------------------- | -------------------------------- |
| `auto-match`    | `{}`                    | `{ roomId, success, isCreator }` |
| `check-room`    | `{ roomId }`            | `{ exists: boolean }`            |
| `join-room`     | `{ roomId? }`           | `{ roomId, success, error? }`    |
| `leave-room`    | `{ roomId }`            | -                                |
| `offer`         | `{ roomId, sdp }`       | -                                |
| `answer`        | `{ roomId, sdp }`       | -                                |
| `ice-candidate` | `{ roomId, candidate }` | -                                |

> **Note**: `auto-match` (권장) - 대기 중인 room 자동 매칭. `isCreator: true`면 대기 중, `false`면 매칭 완료

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
  roomStatus: 'idle' | 'waiting' | 'connected';
  roomId: string | null;
  connect: (token: string) => void;
  autoMatch: () => Promise<{ roomId: string; isCreator: boolean }>; // 권장: 자동 매칭
  joinRoom: (roomId: string) => Promise<void>;
  hangUp: () => void;
}

export const useWebRTC = (): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [roomStatus, setRoomStatus] = useState<'idle' | 'created' | 'joined'>(
    'idle',
  );

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
          setRoomStatus('joined');
          setupCalleeFlow();
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // 권장: 자동 매칭 - 대기 중인 room에 자동 참가, 없으면 생성
  const autoMatch = useCallback(async (): Promise<{
    roomId: string;
    isCreator: boolean;
  }> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('auto-match', {}, (response: any) => {
        if (response.success) {
          roomIdRef.current = response.roomId;
          setRoomStatus(response.isCreator ? 'waiting' : 'connected');

          if (response.isCreator) {
            setupCallerFlow(); // 대기 중 (Caller)
          } else {
            setupCalleeFlow(); // 매칭됨 (Callee)
          }

          resolve({ roomId: response.roomId, isCreator: response.isCreator });
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
    roomStatus,
    roomId: roomIdRef.current,
    connect,
    autoMatch, // 권장: 자동 매칭
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
    roomStatus,
    roomId,
    connect,
    autoMatch,
    hangUp,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
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

      {/* Room Controls - 자동 매칭 */}
      <div className="room-controls">
        <button onClick={autoMatch}>Start Call (Auto Match)</button>
        {roomStatus !== 'idle' && (
          <div className="room-info">
            <span>Room: {roomId}</span>
            <span className="room-status">
              {roomStatus === 'waiting'
                ? '⏳ Waiting for peer...'
                : '✅ Connected'}
            </span>
          </div>
        )}
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

### 4. iOS 카메라/마이크 권한 설정

#### React Native (Expo)

```bash
npx expo install expo-camera expo-av
```

`app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "영상통화를 위해 카메라 접근이 필요합니다.",
        "NSMicrophoneUsageDescription": "영상통화를 위해 마이크 접근이 필요합니다."
      }
    },
    "android": {
      "permissions": ["CAMERA", "RECORD_AUDIO"]
    }
  }
}
```

#### React Native (Bare)

`ios/[앱이름]/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>영상통화를 위해 카메라 접근이 필요합니다.</string>
<key>NSMicrophoneUsageDescription</key>
<string>영상통화를 위해 마이크 접근이 필요합니다.</string>
```

#### 런타임 권한 요청 (React Native)

```typescript
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

const requestPermissions = async () => {
  const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
  const { status: audioStatus } = await Audio.requestPermissionsAsync();

  if (cameraStatus !== 'granted' || audioStatus !== 'granted') {
    Alert.alert(
      '권한 필요',
      '영상통화를 위해 카메라와 마이크 권한이 필요합니다.',
      [{ text: '설정으로 이동', onPress: () => Linking.openSettings() }],
    );
    return false;
  }
  return true;
};
```

#### Swift (네이티브 iOS)

`Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>영상통화를 위해 카메라 접근이 필요합니다.</string>
<key>NSMicrophoneUsageDescription</key>
<string>영상통화를 위해 마이크 접근이 필요합니다.</string>
```

```swift
import AVFoundation

func requestPermissions() {
    AVCaptureDevice.requestAccess(for: .video) { granted in
        if granted {
            AVCaptureDevice.requestAccess(for: .audio) { audioGranted in
                // 권한 처리
            }
        }
    }
}
```

### 5. Socket.IO 버전 매칭

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
