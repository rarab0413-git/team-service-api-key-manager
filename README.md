# 사내 API 키 발급 서비스 Gateway

팀별 API 키 발급 및 중앙 Gateway를 통한 OpenAI API 관리 시스템

> **`_v1` 브랜치**  
> LangChain 기반 **사용자 매뉴얼 RAG**(Chroma 색인 + `POST /api/manual-rag/chat`)·**사용자 도우미** UI가 포함됩니다. 프론트는 **Firebase Auth** 및 메인 도메인 토큰 동기화(`VITE_TOKEN_PROVIDER_URL` 등)를 사용합니다.  
> - 백엔드: `npm install` 시 `backend/.npmrc`의 `legacy-peer-deps=true`로 `@langchain/community` 피어 이슈를 우회합니다.  
> - Chroma: `docker run -p 8000:8000 chromadb/chroma:latest` 후 `CHROMA_URL=http://127.0.0.1:8000`.  
> - 색인: `MANUAL_RAG_REINDEX_SECRET` 설정 후 `POST /api/manual-rag/reindex` + 헤더 `X-Manual-Rag-Secret`.  
> 상세는 `backend/.env.sample`, `frontend/.env.sample`, `docs/USER_MANUAL.md`를 참고하세요.

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
- Firebase Authentication 및 메인 도메인과의 토큰 동기화(iframe/postMessage) 지원
- 팀별 예산 및 모델 접근 제어
- 기능별 API 키 발급 (chat, image, audio, embeddings 등)
- 모든 사용량 자동 로깅

## 기술 스택

### Backend
- Node.js 18
- NestJS 10
- MySQL + mysql2/promise (Native SQL)
- AES-256-GCM (API 키 암호화)
- LangChain + Chroma (`manual-rag` 모듈)

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

# Firebase·Gateway·토큰 공급자 URL 등 — frontend/.env.sample 주석 참고
```

### 3. Backend 실행

```bash
cd backend
npm install   # .npmrc에서 legacy-peer-deps 적용
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

# Manual RAG (USER_MANUAL → Chroma)
POST   /api/manual-rag/reindex           # 헤더 X-Manual-Rag-Secret
POST   /api/manual-rag/chat              # Body { "message": string }
```

## 사용자 도우미 (LangChain · Manual RAG)

`_v1`에 추가된 **사용자 도우미**는 사내 매뉴얼(`docs/USER_MANUAL.md` 등)을 **Chroma 벡터 DB**에 올린 뒤, 질문과 유사한 구절을 **LangChain**으로 검색하고 **채팅 LLM**이 매뉴얼 근거만으로 답하는 **RAG(Retrieval-Augmented Generation)** 흐름입니다. 관리 콘솔 프론트에서는 사이드바 **「사용자 도우미」** 메뉴(`manual-chat` 페이지)에서 동일 API를 호출합니다.

### 동작 개요

1. **색인(ingest)**: 매뉴얼 마크다운을 청크로 나누고, OpenAI 호환 임베딩으로 벡터화한 뒤 Chroma 컬렉션에 저장합니다.
2. **채팅(query)**: 사용자 질문으로 Chroma에서 상위 `MANUAL_RAG_TOP_K`개 문서를 **유사도 검색**하고, 그 텍스트를 `[컨텍스트]`로 넣어 `ChatOpenAI`가 한국어로 답을 생성합니다. 응답에는 참고한 청크 메타데이터(`chunkId`, `section`, `subsection`)가 `sources`로 함께 반환됩니다.
3. **안전 장치**: 시스템 프롬프트상 컨텍스트 밖 추측·보완은 하지 않도록 되어 있으며, 매뉴얼에 없으면 안내 문구로 응답합니다.

백엔드 구현은 NestJS 모듈 `backend/src/manual-rag/` 에 있으며, `@langchain/community`(Chroma), `@langchain/openai`(Chat), 공유 임베딩 팩토리 등을 사용합니다.

### 사전 준비

- **Chroma**: 예) `docker run -p 8000:8000 chromadb/chroma:latest` 후 `CHROMA_URL`을 해당 호스트에 맞게 설정합니다.
- **환경 변수**: `backend/.env.sample`의 **Manual RAG** 블록을 참고합니다. 요약하면 다음이 있습니다.
  - **벡터/색인**: `CHROMA_URL`, `CHROMA_COLLECTION_NAME`, 임베딩용 `EMBEDDING_*` / `OPENAI_API_KEY`(직접 OpenAI 사용 시)
  - **채팅 LLM**: `MANUAL_RAG_CHAT_MODEL`, `MANUAL_RAG_CHAT_TIMEOUT_MS`, `MANUAL_RAG_TOP_K`
  - **게이트웨이 분리**: 임베딩과 동일 OpenAI 호환 Gateway를 쓰거나, 채팅만 별도로 `RAG_CHAT_GATEWAY_BASE_URL` + `RAG_CHAT_GATEWAY_API_KEY`(가상 팀 키 등)를 둘 수 있습니다. 자세한 우선순위는 `ManualRagQueryService` 주석과 `.env.sample`을 따릅니다.
- **의존성 설치**: 백엔드 루트의 `backend/.npmrc`에 `legacy-peer-deps=true`가 있어 `@langchain/community` 피어 의존성 경고를 우회합니다.

### 매뉴얼 색인 방법

- **HTTP**: `MANUAL_RAG_REINDEX_SECRET` 설정 후  
  `POST /api/manual-rag/reindex` + 헤더 `X-Manual-Rag-Secret: <동일 값>`
- **스크립트**: `cd backend && npm run ingest:manual` (로컬 색인 스크립트, `package.json`의 `ingest:manual` 참고)

색인이 끝나지 않았거나 Chroma가 내려가 있으면 채팅 시 검색·응답이 실패할 수 있으므로, 운영 시 Chroma 가용성과 재색인 절차를 맞춰 두는 것이 좋습니다.

### 채팅 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | `POST /api/manual-rag/chat` |
| 인증 | 프론트 앱에서는 로그인 후에만 **사용자 도우미** 화면으로 들어가며, 호출은 동일 Origin의 `/api` 프록시를 통해 갑니다. 백엔드 컨트롤러에는 **채팅 전용 인증 가드가 없을 수 있으므로**, 인터넷에 노출할 때는 리버스 프록시·방화벽 등으로 API 접근을 제한하는 것을 권장합니다. **reindex**와 달리 `X-Manual-Rag-Secret`는 필요 없습니다. |
| 요청 본문 | `{ "message": string }` (최대 2000자, class-validator 검증) |
| 응답 | `{ "answer": string, "sources": [{ "chunkId", "section", "subsection" }, ...] }` |

### 프론트엔드

- 경로: `frontend/src/pages/manual-chat.tsx`
- API 래퍼: `frontend/src/lib/api.ts`의 `manualRagApi.chat`
- 로그인 후 사이드바에서 **사용자 도우미**로 이동해 질문을 입력하면 위 채팅 API로 연결됩니다.

매뉴얼 본문·플레이스홀더 URL 등 문서 작업은 `docs/USER_MANUAL.md`를 참고하세요.

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
│   │   ├── manual-rag/            # USER_MANUAL → Chroma, LangChain RAG 채팅
│   │   │   ├── manual-rag.controller.ts
│   │   │   ├── manual-rag-query.service.ts
│   │   │   ├── manual-ingest.service.ts
│   │   │   └── ...
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
        │   ├── manual-chat.tsx       # 사용자 도우미 (RAG 채팅 UI)
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





