# WebRTC 1:1 영상통화 - 백엔드 시그널링 서버

## TL;DR

> **Quick Summary**: NestJS WebSocket Gateway를 사용한 1:1 영상통화용 P2P 시그널링 서버 구현 (POC)
>
> **Deliverables**:
>
> - WebSocket Gateway (`src/call/call.gateway.ts`)
> - Room 관리 모듈 (`src/call/call.module.ts`, `call.service.ts`)
> - JWT 인증 통합 (기존 AuthModule 재사용)
> - 수동 테스트용 HTML 파일 (`test/manual/video-call-test.html`)
>
> **Estimated Effort**: Short (4-6시간)
> **Parallel Execution**: NO - sequential (의존성 체인)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request

WebRTC를 사용해서 1:1 영상통화를 구현. POC/프로토타입 목적.

### Interview Summary

**Key Discussions**:

- 통화 규모: 1:1 (2명만) → P2P 아키텍처 적합
- 목적: POC/프로토타입 → 최소 구현, 빠른 검증
- 추가 기능: 기본만 (녹화/화면공유 없음)
- 테스트: 수동 검증 (브라우저 테스트)
- 범위: 백엔드만 구현, 프론트엔드는 별도 플랜

**Research Findings**:

- 프로젝트에 WebSocket 없음 → @nestjs/websockets 설치 필요
- JWT 인증 이미 구현됨 → AuthModule의 JwtService 재사용
- 모듈 패턴 확립됨 → src/call/ 디렉토리로 동일 패턴 적용

### Metis Review

**Identified Gaps** (addressed):

- Missing dependencies → Task 1에서 설치
- JWT secret 하드코딩 → 경고 표시, 별도 scope
- Room cleanup 필요 → handleDisconnect 구현
- Event 수 제한 필요 → 6개로 제한

**Defaults Applied** (POC 목적):

- Room 저장: In-memory (Map) - DB 저장 안함
- Room ID: UUID (서버 생성)
- Timeout: 없음
- 상태 관리: Minimal (relay만)
- 재연결: 미지원
- 같은 포트: 3000

---

## Work Objectives

### Core Objective

NestJS WebSocket Gateway를 사용하여 WebRTC P2P 연결을 위한 시그널링 서버 구현

### Concrete Deliverables

- `src/call/call.module.ts` - Call 모듈 정의
- `src/call/call.gateway.ts` - WebSocket Gateway (시그널링)
- `src/call/call.service.ts` - Room 관리 서비스
- `src/call/dto/` - 시그널링 DTO들
- `test/manual/video-call-test.html` - 수동 테스트용 HTML

### Definition of Done

- [ ] WebSocket 연결 시 JWT 토큰 검증 성공
- [ ] Room 생성/참가/퇴장 동작
- [ ] SDP Offer/Answer 교환 동작
- [ ] ICE Candidate 교환 동작
- [ ] 브라우저 2개에서 P2P 연결 수립 확인

### Must Have

- JWT 인증된 사용자만 WebSocket 연결 허용
- Room당 최대 2명 제한 (1:1 통화)
- 연결 종료 시 Room 자동 정리
- 상대방에게 시그널 메시지 relay

### Must NOT Have (Guardrails)

- ❌ 3명 이상 그룹 통화 지원
- ❌ 녹화/화면공유 기능
- ❌ 통화 기록 DB 저장
- ❌ TURN 서버 설정
- ❌ 별도 WS 인증 시스템 (기존 JWT 재사용)
- ❌ 6개 초과 이벤트 타입
- ❌ 5개 초과 DTO 클래스
- ❌ 자동화 테스트 작성
- ❌ 에러 코드 5개 초과

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (Jest 설정됨)
- **User wants tests**: Manual-only
- **Framework**: N/A (수동 검증)

### Manual Verification Approach

**By Deliverable Type: WebSocket + Browser**

모든 검증은 agent가 실행 가능한 명령어 또는 Playwright 자동화로 수행:

> **NOTE**: Socket.IO는 순수 WebSocket이 아닌 자체 프로토콜을 사용하므로 wscat은 호환되지 않습니다.
> 검증은 `socket.io-client` (devDependencies)를 사용한 Node 스크립트 또는 브라우저 HTML로 수행합니다.

**Node 스크립트 기반 검증** (socket.io-client):

```bash
# socket.io-client가 devDependencies에 설치되어 있어야 함 (Task 1에서 설치)
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3000', { auth: { token: 'YOUR_JWT' } });
socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (e) => console.log('Error:', e.message));
"
```

**브라우저 기반 검증** (Playwright skill):

- test/manual/video-call-test.html 파일을 두 개의 브라우저 탭에서 열기
- 각 탭에서 토큰 입력 → 연결 → Room 참가 → 통화 연결 확인

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Sequential - 의존성 체인):
Task 1: Dependencies 설치
    ↓
Task 2: Module 생성
    ↓
Task 3: JWT 인증 구현
    ↓
Task 4: Room 관리 구현
    ↓
Task 5: 시그널링 구현
    ↓
Task 6: 테스트 HTML 작성

Critical Path: 1 → 2 → 3 → 4 → 5 → 6
Parallel Speedup: N/A (순차적)
```

### Dependency Matrix

| Task | Depends On | Blocks        | Can Parallelize With |
| ---- | ---------- | ------------- | -------------------- |
| 1    | None       | 2, 3, 4, 5, 6 | None                 |
| 2    | 1          | 3, 4, 5       | None                 |
| 3    | 2          | 4, 5          | None                 |
| 4    | 3          | 5, 6          | None                 |
| 5    | 4          | 6             | None                 |
| 6    | 5          | None          | None                 |

### Agent Dispatch Summary

| Wave | Tasks            | Recommended Agents                                                                   |
| ---- | ---------------- | ------------------------------------------------------------------------------------ |
| 1    | 1, 2, 3, 4, 5, 6 | delegate_task(category="quick", load_skills=[], run_in_background=false) - 순차 실행 |

---

## TODOs

### Task 1: Dependencies 설치

- [ ] 1. WebSocket 관련 패키지 설치

  **What to do**:
  - @nestjs/websockets 설치
  - @nestjs/platform-socket.io 설치
  - socket.io-client 설치 (devDependencies - 검증용)
  - 타입 정의 확인

  **Must NOT do**:
  - 다른 불필요한 패키지 설치

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 패키지 설치 작업
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first task)
  - **Blocks**: Tasks 2, 3, 4, 5, 6
  - **Blocked By**: None

  **References**:
  - `package.json` - 현재 의존성 확인
  - NestJS WebSockets 공식 문서: https://docs.nestjs.com/websockets/gateways

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  bun add @nestjs/websockets @nestjs/platform-socket.io
  bun add -d socket.io-client  # devDependencies for verification scripts

  # Verify installation:
  cat package.json | grep -E "@nestjs/websockets|@nestjs/platform-socket.io|socket.io-client"
  # Assert: @nestjs/websockets, @nestjs/platform-socket.io가 dependencies에, socket.io-client가 devDependencies에 존재

  # Verify no errors:
  bun run build
  # Assert: Exit code 0
  ```

  **Commit**: YES
  - Message: `feat(call): add websocket dependencies for signaling server`
  - Files: `package.json`, `bun.lockb`
  - Pre-commit: `bun run build`

---

### Task 2: Call Module 생성

- [ ] 2. Call 모듈 스캐폴딩 생성

  **What to do**:
  - `src/call/` 디렉토리 생성
  - `call.module.ts` 생성 (Gateway, Service 등록)
  - `call.service.ts` 생성 (빈 서비스)
  - `call.gateway.ts` 생성 (빈 Gateway)
  - `app.module.ts`에 CallModule import

  **Must NOT do**:
  - 로직 구현 (다음 Task에서)
  - DTO 생성 (Task 5에서)
  - 테스트 파일 생성

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 파일 생성 및 기본 구조 작업
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/auth/auth.module.ts:1-21` - NestJS 모듈 패턴 (imports, providers, exports 구조)
  - `src/users/users.module.ts` - 서비스 모듈 패턴

  **External References**:
  - NestJS Gateway 문서: https://docs.nestjs.com/websockets/gateways#gateways

  **WHY Each Reference Matters**:
  - `auth.module.ts`: AuthModule exports를 참고하여 JwtService를 CallModule에서 사용 가능하게 구성
  - `users.module.ts`: 간단한 모듈 구조 패턴 참고

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  ls -la src/call/
  # Assert: call.module.ts, call.service.ts, call.gateway.ts 파일 존재

  # Verify module imports:
  grep -l "CallModule" src/app.module.ts
  # Assert: CallModule이 app.module.ts에 import됨

  # Verify build:
  bun run build
  # Assert: Exit code 0, 컴파일 에러 없음
  ```

  **Expected File Structure**:

  ```
  src/call/
  ├── call.module.ts
  ├── call.service.ts
  └── call.gateway.ts
  ```

  **Commit**: YES
  - Message: `feat(call): scaffold call module for webrtc signaling`
  - Files: `src/call/*.ts`, `src/app.module.ts`
  - Pre-commit: `bun run build`

---

### Task 3: WebSocket JWT 인증 구현

- [ ] 3. handleConnection에서 JWT 토큰 검증 구현

  **What to do**:
  - AuthModule에서 JwtService export 추가
  - CallModule에서 AuthModule import
  - handleConnection()에서 query param 또는 handshake auth에서 토큰 추출
  - JwtService.verifyAsync()로 토큰 검증
  - 검증 실패 시 socket.disconnect() 호출
  - 검증 성공 시 socket.data에 user 정보 저장

  **Must NOT do**:
  - 새로운 Guard 생성 (handleConnection에서 직접 처리)
  - 새로운 JWT 모듈 생성 (기존 AuthModule 재사용)
  - Refresh token 로직

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 패턴을 따르는 인증 로직 추가
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/auth/auth.module.ts:12-18` - JwtModule 설정 및 secret 위치
  - `src/auth/jwt.strategy.ts:10-25` - JWT payload 구조 (`{ email, sub: id }`)
  - `src/auth/auth.service.ts:25-35` - JwtService 사용 패턴

  **API/Type References**:
  - Socket.IO Server handshake: `socket.handshake.auth.token` 또는 `socket.handshake.query.token`
  - socket.data: 커스텀 데이터 저장 위치

  **External References**:
  - NestJS WebSocket Authentication: https://docs.nestjs.com/websockets/gateways#guards
  - Socket.IO Middleware: https://socket.io/docs/v4/middlewares/

  **WHY Each Reference Matters**:
  - `auth.module.ts`: JwtService를 export하도록 수정 필요
  - `jwt.strategy.ts`: JWT payload 구조 확인하여 socket.data에 동일 구조 저장
  - `auth.service.ts`: JwtService.signAsync() 사용 패턴 참고

  **Acceptance Criteria**:

  ```bash
  # 1. Start server
  bun run start:dev &
  sleep 3

  # 2. Get valid JWT token (login)
  TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password123"}' \
    | jq -r '.access_token')

  # 3. Test valid token connection (using wscat or node script)
  # Agent runs node script:
  node -e "
  const io = require('socket.io-client');
  const socket = io('http://localhost:3000', { auth: { token: '$TOKEN' } });
  socket.on('connect', () => { console.log('SUCCESS: Connected'); process.exit(0); });
  socket.on('connect_error', (e) => { console.log('FAIL:', e.message); process.exit(1); });
  setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
  "
  # Assert: "SUCCESS: Connected" 출력

  # 4. Test invalid token rejection
  node -e "
  const io = require('socket.io-client');
  const socket = io('http://localhost:3000', { auth: { token: 'invalid' } });
  socket.on('connect', () => { console.log('FAIL: Should not connect'); process.exit(1); });
  socket.on('connect_error', (e) => { console.log('SUCCESS: Rejected'); process.exit(0); });
  setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
  "
  # Assert: "SUCCESS: Rejected" 출력
  ```

  **Note**: 테스트용 사용자가 없으면 먼저 signup 필요

  **Commit**: YES
  - Message: `feat(call): implement jwt authentication for websocket connections`
  - Files: `src/call/call.gateway.ts`, `src/auth/auth.module.ts`
  - Pre-commit: `bun run build`

---

### Task 4: Room 관리 구현

- [ ] 4. Room 생성/참가/퇴장 로직 구현

  **What to do**:
  - CallService에 rooms Map 추가 (in-memory)
  - Room 타입 정의: `{ id: string, users: Map<socketId, userInfo> }`
  - joinRoom(roomId?):
    - roomId가 없으면: 새 room 생성 (UUID) + 첫 번째 유저로 추가 (caller)
    - roomId가 있으면: 기존 room에 참가 (최대 2명 제한, callee)
  - leaveRoom(): room에서 나가기, 빈 room 삭제
  - handleDisconnect()에서 자동 leaveRoom 호출
  - 이벤트: `join-room`, `leave-room`, `user-joined`, `user-left`

  > **NOTE**: `create-room` 이벤트를 별도로 두지 않고 `join-room`에 통합하여 이벤트 수를 6개로 유지합니다.
  > `join-room` 호출 시 `roomId`가 없으면 새 room 생성, 있으면 기존 room 참가.

  **Must NOT do**:
  - DB에 room 저장
  - 3명 이상 허용
  - Room 목록 조회 API
  - Room 히스토리/통계

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 간단한 in-memory 상태 관리
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5, 6
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `src/users/users.service.ts:10-30` - NestJS Service 패턴 (Injectable, 메서드 구조)

  **Type References**:
  - Socket.IO Server types: `Socket`, `Server` from `socket.io`

  **WHY Each Reference Matters**:
  - `users.service.ts`: NestJS 서비스 작성 패턴 참고

  **Data Structure**:

  ```typescript
  interface Room {
    id: string;
    users: Map<string, { odId: string; email: string; socketId: string }>;
  }

  // In CallService
  private rooms = new Map<string, Room>();
  ```

  **Acceptance Criteria**:

  ```bash
  # Start server
  bun run start:dev &
  sleep 3

  # Get tokens for 2 users (assume users exist)
  TOKEN1=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user1@test.com","password":"pass123"}' | jq -r '.access_token')

  TOKEN2=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user2@test.com","password":"pass123"}' | jq -r '.access_token')

  # Test room creation and join (node script)
  # NOTE: join-room without roomId = create new room (caller)
  #       join-room with roomId = join existing room (callee)
  node -e "
  const io = require('socket.io-client');
  const socket1 = io('http://localhost:3000', { auth: { token: '$TOKEN1' } });
  const socket2 = io('http://localhost:3000', { auth: { token: '$TOKEN2' } });

  socket1.on('connect', () => {
    // Caller: join-room without roomId creates a new room
    socket1.emit('join-room', {}, (response) => {
      console.log('Room created:', response.roomId);

      // Callee: join-room with roomId joins existing room
      socket2.emit('join-room', { roomId: response.roomId }, (res2) => {
        console.log('User2 joined:', res2.success);

        socket1.on('user-joined', (data) => {
          console.log('SUCCESS: User joined event received');
          process.exit(0);
        });
      });
    });
  });

  setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 10000);
  "
  # Assert: "SUCCESS: User joined event received" 출력
  ```

  **Commit**: YES
  - Message: `feat(call): implement room management for 1:1 video calls`
  - Files: `src/call/call.service.ts`, `src/call/call.gateway.ts`
  - Pre-commit: `bun run build`

---

### Task 5: 시그널링 (Offer/Answer/ICE) 구현

- [ ] 5. WebRTC 시그널링 메시지 relay 구현

  **What to do**:
  - DTO 생성: `OfferDto`, `AnswerDto`, `IceCandidateDto`
  - `offer` 이벤트: SDP offer를 상대방에게 relay
  - `answer` 이벤트: SDP answer를 상대방에게 relay
  - `ice-candidate` 이벤트: ICE candidate를 상대방에게 relay
  - 에러 이벤트: `error` (code, message)
  - 모든 메시지는 같은 room의 상대방에게만 전송

  **Must NOT do**:
  - SDP 내용 검증/수정
  - ICE candidate 필터링
  - 미디어 서버 통합
  - 6개 초과 이벤트 타입 추가
  - 5개 초과 DTO 클래스

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 메시지 relay 로직 (단순 전달)
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 6
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `src/auth/auth.dto.ts` - DTO 작성 패턴 (class-validator 데코레이터)

  **External References**:
  - WebRTC SDP: https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription
  - ICE Candidate: https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate

  **WHY Each Reference Matters**:
  - `auth.dto.ts`: class-validator 데코레이터 사용 패턴 참고
  - MDN WebRTC: SDP/ICE 데이터 구조 이해

  **DTO Structure**:

  ```typescript
  // src/call/dto/offer.dto.ts
  class OfferDto {
    @IsString()
    roomId: string;

    @IsObject()
    sdp: RTCSessionDescriptionInit;
  }

  // src/call/dto/answer.dto.ts
  class AnswerDto {
    @IsString()
    roomId: string;

    @IsObject()
    sdp: RTCSessionDescriptionInit;
  }

  // src/call/dto/ice-candidate.dto.ts
  class IceCandidateDto {
    @IsString()
    roomId: string;

    @IsObject()
    candidate: RTCIceCandidateInit;
  }
  ```

  **Event Summary** (6개 Client→Server 이벤트만 구현):

  | Event           | Direction                | Payload               | Description                             |
  | --------------- | ------------------------ | --------------------- | --------------------------------------- |
  | `join-room`     | Client → Server          | `{ roomId?: string }` | roomId 없으면 새 room 생성, 있으면 참가 |
  | `leave-room`    | Client → Server          | `{ roomId }`          | room에서 퇴장                           |
  | `offer`         | Client → Server → Client | `OfferDto`            | SDP offer를 상대방에게 relay            |
  | `answer`        | Client → Server → Client | `AnswerDto`           | SDP answer를 상대방에게 relay           |
  | `ice-candidate` | Client → Server → Client | `IceCandidateDto`     | ICE candidate를 상대방에게 relay        |
  | `error`         | Server → Client          | `{ code, message }`   | 에러 알림                               |

  **Server → Client 알림 (위 이벤트의 부수 효과):**
  | Event | Trigger | Payload |
  |-------|---------|---------|
  | `user-joined` | 상대방이 `join-room` 성공 시 | `{ odId, email }` |
  | `user-left` | 상대방이 `leave-room` 또는 disconnect 시 | `{ odId, email }` |

  > **NOTE**: `user-joined`, `user-left`는 별도 핸들러가 아닌 `join-room`, `leave-room` 처리 시 상대방에게 emit하는 알림입니다.

  **Acceptance Criteria**:

  ```bash
  # Full signaling flow test (requires 2 sockets)
  # This will be verified via test HTML in Task 6

  # Build verification:
  bun run build
  # Assert: Exit code 0

  # Check DTOs exist:
  ls src/call/dto/
  # Assert: offer.dto.ts, answer.dto.ts, ice-candidate.dto.ts 존재
  ```

  **Commit**: YES
  - Message: `feat(call): implement webrtc signaling relay (offer/answer/ice)`
  - Files: `src/call/call.gateway.ts`, `src/call/dto/*.ts`
  - Pre-commit: `bun run build`

---

### Task 6: 수동 테스트용 HTML 작성

- [ ] 6. 브라우저 테스트용 단일 HTML 파일 생성

  **What to do**:
  - `test/manual/video-call-test.html` 생성
  - Socket.IO CDN 스크립트 포함
  - 토큰 입력 필드
  - Room 생성/참가 버튼
  - Local/Remote video 엘리먼트
  - WebRTC PeerConnection 로직 (inline JS)
  - Google STUN 서버 설정: `stun:stun.l.google.com:19302`
  - 연결 상태 표시

  **Must NOT do**:
  - React/Vue 등 프레임워크 사용
  - 별도 JS 파일 분리
  - 복잡한 UI/스타일링
  - 에러 핸들링 과도하게

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 HTML 파일 작성
  - **Skills**: `[]`
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 5

  **References**:

  **External References**:
  - Socket.IO Client CDN: https://cdn.socket.io/4.7.2/socket.io.min.js
  - WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
  - Google STUN: `stun:stun.l.google.com:19302`

  **WHY Each Reference Matters**:
  - Socket.IO CDN: 별도 빌드 없이 바로 사용
  - Google STUN: POC에서 무료로 사용 가능한 STUN 서버

  **HTML Structure**:

  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>WebRTC Test</title>
      <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    </head>
    <body>
      <h1>WebRTC 1:1 Video Call Test</h1>

      <!-- Auth -->
      <input id="token" placeholder="JWT Token" />
      <button onclick="connect()">Connect</button>

      <!-- Room -->
      <!-- NOTE: "Create Room" calls join-room without roomId -->
      <button onclick="joinRoom()">Create Room (Caller)</button>
      <input id="roomId" placeholder="Room ID" />
      <button onclick="joinRoom(document.getElementById('roomId').value)">
        Join Room (Callee)
      </button>

      <!-- Video -->
      <video id="localVideo" autoplay muted></video>
      <video id="remoteVideo" autoplay></video>

      <!-- Status -->
      <div id="status">Disconnected</div>

      <script>
        // WebRTC + Socket.IO logic here
        const config = {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        };

        // joinRoom(roomId) - roomId 없으면 새 room 생성
        function joinRoom(roomId) {
          socket.emit('join-room', { roomId }, (response) => {
            if (response.success) {
              document.getElementById('roomId').value = response.roomId;
              // ... setup WebRTC
            }
          });
        }
        // ... implementation
      </script>
    </body>
  </html>
  ```

  **Acceptance Criteria**:

  **Playwright Automation** (using playwright skill):

  ```
  # Agent executes via playwright browser automation:

  # Tab 1 (Caller):
  1. Open: file:///.../test/manual/video-call-test.html
  2. Fill: #token with valid JWT
  3. Click: Connect button
  4. Wait for: #status shows "Connected"
  5. Click: "Create Room (Caller)" button  # This calls join-room without roomId
  6. Wait for: #roomId has value (UUID)
  7. Screenshot: .sisyphus/evidence/task-6-caller.png

  # Tab 2 (Callee):
  1. Open: file:///.../test/manual/video-call-test.html
  2. Fill: #token with valid JWT (different user)
  3. Click: Connect button
  4. Fill: #roomId with room ID from Tab 1
  5. Click: "Join Room (Callee)" button  # This calls join-room with roomId
  6. Wait for: #status shows "Connected to peer"
  7. Assert: #remoteVideo has srcObject (video stream)
  8. Screenshot: .sisyphus/evidence/task-6-callee.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshots of both browser tabs showing connected state
  - [ ] Console logs showing ICE connection state changes

  **Commit**: YES
  - Message: `test(call): add manual test html for webrtc video call`
  - Files: `test/manual/video-call-test.html`
  - Pre-commit: N/A (HTML file)

---

## Commit Strategy

| After Task | Message                                  | Files                            | Verification    |
| ---------- | ---------------------------------------- | -------------------------------- | --------------- |
| 1          | `feat(call): add websocket dependencies` | package.json, bun.lockb          | `bun run build` |
| 2          | `feat(call): scaffold call module`       | src/call/\*.ts, app.module.ts    | `bun run build` |
| 3          | `feat(call): implement jwt auth for ws`  | call.gateway.ts, auth.module.ts  | `bun run build` |
| 4          | `feat(call): implement room management`  | call.service.ts, call.gateway.ts | `bun run build` |
| 5          | `feat(call): implement signaling relay`  | call.gateway.ts, dto/\*.ts       | `bun run build` |
| 6          | `test(call): add manual test html`       | test/manual/video-call-test.html | N/A             |

---

## Success Criteria

### Verification Commands

```bash
# Build succeeds
bun run build  # Expected: Exit code 0

# Server starts
bun run start:dev &  # Expected: "Nest application successfully started"

# WebSocket endpoint available
curl -s http://localhost:3000/socket.io/  # Expected: Not 404
```

### Final Checklist

- [ ] All "Must Have" present:
  - [ ] JWT 인증 WebSocket 연결
  - [ ] Room 최대 2명 제한
  - [ ] 연결 종료 시 cleanup
  - [ ] Offer/Answer/ICE relay
- [ ] All "Must NOT Have" absent:
  - [ ] No 3+ user support
  - [ ] No recording
  - [ ] No DB storage
  - [ ] No TURN config
- [ ] Manual browser test passes (2 tabs connected)
