# 사내 API 키 발급 서비스 Gateway

팀별 API 키 발급 및 중앙 Gateway를 통한 OpenAI API 관리 시스템

## 아키텍처

```
[팀 서비스]
  ↓ team-sk-xxx (프록시 키)
[Internal Gateway]
  ├─ team A → sk-real-A
  ├─ team B → sk-real-B
  └─ team C → sk-real-C
[OpenAI]
```

### 핵심 포인트
- Real key는 Gateway에만 존재 (팀에게 노출되지 않음)
- Firebase Authentication을 통한 사용자 인증
- 팀별 예산 및 모델 접근 제어
- 기능별 API 키 발급 (chat, image, audio, embeddings 등)
- 모든 사용량 자동 로깅

## 기술 스택

### Backend
- Node.js 18
- NestJS 10
- MySQL + mysql2/promise (Native SQL)
- AES-256-GCM (API 키 암호화)

### Frontend
- React 18 + TypeScript
- Vite
- TanStack Query (서버 상태 관리)
- Zustand (클라이언트 상태 관리)
- Tailwind CSS

## 시작하기

### 1. 데이터베이스 설정

```bash
# MySQL에서 스키마 실행
mysql -u root -p < backend/database/schema.sql
```

### 2. 환경 변수 설정

#### Backend 환경 변수

```bash
# backend/.env 파일 생성
cp backend/.env.sample backend/.env

# 환경 변수 수정
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=api_key_manager
OPENAI_API_KEY=sk-your-real-openai-key
PORT=3005
API_KEY_PREFIX=team-sk

# 암호화 키 생성 (64자 hex 문자열)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_string_here
```

#### Frontend 환경 변수

```bash
# frontend/.env 파일 생성
cp frontend/.env.sample frontend/.env

# Firebase 설정 (Firebase Console에서 프로젝트 설정 확인)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
VITE_FIREBASE_DATABASE_URL=your_firebase_database_url

# Gateway API Base URL
VITE_GATEWAY_URL=https://your-gateway-domain.com

# Cross-Origin Token Provider 설정 (선택사항)
VITE_TOKEN_PROVIDER_URL=https://your-main-domain.com/token-provider
VITE_MAIN_DOMAIN_ORIGIN=https://your-main-domain.com
```

### 3. Backend 실행

```bash
cd backend
npm install
npm run start:dev
```

### 4. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

## API 엔드포인트

### Gateway (OpenAI 호환)

팀에서 발급받은 API 키로 호출합니다.

```bash
# Chat Completions
POST /v1/chat/completions
Authorization: Bearer team-sk-xxxxxxxx

# Embeddings
POST /v1/embeddings
Authorization: Bearer team-sk-xxxxxxxx

# Models List
GET /v1/models
Authorization: Bearer team-sk-xxxxxxxx
```

### 사용 예시

```bash
# Gateway URL은 환경 변수 VITE_GATEWAY_URL로 설정하세요
curl -X POST ${VITE_GATEWAY_URL:-https://your-gateway-domain.com}/v1/chat/completions \
  -H "Authorization: Bearer team-sk-xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Admin API

관리자용 내부 API입니다.

```bash
# Teams
GET    /api/teams          # 전체 팀 조회
POST   /api/teams          # 새 팀 생성
GET    /api/teams/:id      # 특정 팀 조회
PUT    /api/teams/:id      # 팀 정보 수정
DELETE /api/teams/:id      # 팀 삭제

# API Keys
GET    /api/api-keys              # 전체 API 키 조회
GET    /api/api-keys?teamId=1     # 특정 팀의 API 키 조회
POST   /api/api-keys              # 새 API 키 발급
PUT    /api/api-keys/:id/revoke   # API 키 폐기
PUT    /api/api-keys/:id/models   # 허용 모델 수정

# Usage
GET    /api/usage/team/:id               # 팀 사용 로그
GET    /api/usage/team/:id/current-month # 이번 달 사용량
GET    /api/usage/team/:id/monthly       # 월별 사용량 이력
```

## 데이터 모델

### teams
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | PK |
| name | VARCHAR(100) | 팀 이름 |
| monthly_budget | DECIMAL(10,2) | 월 예산 (USD) |
| created_at | TIMESTAMP | 생성일 |

### team_api_keys
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | PK |
| team_id | INT | FK → teams |
| encrypted_key | TEXT | AES-256-GCM 암호화된 키 |
| key_prefix | VARCHAR(20) | 표시용 프리픽스 |
| status | ENUM | active/revoked/expired |
| allowed_models | JSON | 허용 모델 목록 |
| allowed_features | JSON | 허용 기능 목록 (chat, image_generation 등) |
| monthly_limit_usd | DECIMAL(10,2) | 키별 월 한도 |
| created_at | TIMESTAMP | 생성일 |
| revoked_at | TIMESTAMP | 폐기일 |

### usage_logs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT | PK |
| team_id | INT | FK → teams |
| api_key_id | INT | FK → team_api_keys |
| model | VARCHAR(50) | 사용 모델 |
| prompt_tokens | INT | 프롬프트 토큰 |
| completion_tokens | INT | 완성 토큰 |
| cost_usd | DECIMAL(10,6) | 비용 |
| created_at | TIMESTAMP | 요청 시간 |

## Gateway 동작 흐름

```
1. 요청 수신 (Authorization: Bearer team-sk-xxx)
2. API 키 복호화 및 검증
3. 팀 정보 조회
4. 모델 허용 여부 확인
5. 기능 허용 여부 확인 (chat, image 등)
6. 예산 초과 여부 확인
7. OpenAI API 호출 (실제 키 사용)
8. 사용량 로깅
9. 응답 반환
```

## 지원 기능

- **Chat Completions**: GPT 모델을 사용한 채팅 완성
- **Image Generation**: DALL-E를 사용한 이미지 생성
- **Image Vision**: 이미지 분석 기능
- **Audio Transcription**: Whisper를 사용한 음성 전사
- **Audio Speech**: TTS를 사용한 음성 생성
- **Embeddings**: 텍스트 임베딩 생성

## 프로젝트 구조

```
team-service-api-key-manager/
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── config/
│   │   │   │   └── database.config.ts
│   │   │   └── filters/
│   │   │       └── http-exception.filter.ts
│   │   ├── teams/
│   │   │   ├── dto/
│   │   │   ├── teams.controller.ts
│   │   │   ├── teams.service.ts
│   │   │   ├── teams.repository.ts
│   │   │   └── teams.module.ts
│   │   ├── api-keys/
│   │   │   ├── dto/
│   │   │   ├── api-keys.controller.ts
│   │   │   ├── api-keys.service.ts
│   │   │   ├── api-keys.repository.ts
│   │   │   └── api-keys.module.ts
│   │   ├── gateway/
│   │   │   ├── gateway.controller.ts
│   │   │   ├── gateway.service.ts
│   │   │   └── gateway.module.ts
│   │   ├── usage/
│   │   │   ├── usage.controller.ts
│   │   │   ├── usage.service.ts
│   │   │   ├── usage.repository.ts
│   │   │   └── usage.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── database/
│       └── schema.sql
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/
        │   │   └── sidebar.tsx
        │   └── ui/
        │       ├── button.tsx
        │       ├── card.tsx
        │       ├── input.tsx
        │       ├── modal.tsx
        │       └── badge.tsx
        ├── pages/
        │   ├── dashboard.tsx
        │   ├── teams.tsx
        │   ├── api-keys.tsx
        │   └── settings.tsx
        ├── lib/
        │   ├── api.ts
        │   └── firebase.ts          # Firebase 인증 설정
        ├── store/
        │   ├── app-store.ts
        │   └── auth-store.ts        # 인증 상태 관리
        └── App.tsx
```

## 보안 고려사항

1. **Real API Key 보호**: OpenAI 실제 키는 Gateway 서버의 환경 변수에만 존재
2. **API 키 암호화**: 팀 API 키는 AES-256-GCM으로 암호화되어 DB에 저장
3. **Firebase 인증**: 사용자 인증은 Firebase Authentication을 통해 관리
4. **환경 변수 보호**: 모든 민감 정보는 환경 변수로 관리, `.env` 파일은 Git에 커밋하지 않음
5. **예산 제한**: 팀별, 키별 월간 사용량 제한
6. **모델 접근 제어**: 팀별로 사용 가능한 모델 제한
7. **기능별 접근 제어**: API 키별로 허용된 기능만 사용 가능 (chat, image, audio 등)
8. **사용량 로깅**: 모든 요청이 자동으로 기록됨

## 인증 시스템

- **Firebase Authentication**: 이메일/비밀번호 기반 인증
- **Cross-Origin Token 공유**: 메인 도메인과 서브 도메인 간 인증 상태 공유 지원
- **역할 기반 접근 제어**: Admin/User 역할 구분
- **팀 기반 권한**: 사용자는 자신이 속한 팀의 API 키만 조회 가능

## 주의사항

⚠️ **중요**: 
- `.env` 파일은 절대 Git에 커밋하지 마세요
- Firebase API 키와 OpenAI API 키는 외부에 노출되지 않도록 주의하세요
- 프로덕션 환경에서는 반드시 실제 환경 변수를 설정하세요

## 라이선스

MIT License





