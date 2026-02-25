# 📚 API Gateway 사용자 매뉴얼

> 이 문서는 팀 API 키를 발급받고 OpenAI API를 호출하는 방법을 안내합니다.

---

## 📋 목차

1. [API 키 발급 요청하기](#1-api-키-발급-요청하기)
2. [발급받은 키 확인하기](#2-발급받은-키-확인하기)
3. [키 분실 시 조회 요청하기](#3-키-분실-시-조회-요청하기)
4. [API 호출하기](#4-api-호출하기)
5. [에러 해결](#5-에러-해결)
6. [문의](#6-문의)

---

## 1. API 키 발급 요청하기

### 1.1 발급 요청 방법

**[API 키]** 메뉴에서 **[ + 키 발급 신청 ]** 버튼을 클릭합니다.

```
┌─────────────────────────────────────────┐
│  API 키 관리              [ + 키 발급 신청 ]
├─────────────────────────────────────────┤
│                                         │
│  내 팀: Engineering                     │
│  발급된 키: 2개                          │
│                                         │
└─────────────────────────────────────────┘
```

### 1.2 발급 신청 화면

```
┌─────────────────────────────────────────┐
│  API 키 발급 신청                  [X]  │
├─────────────────────────────────────────┤
│                                         │
│  요청 사유                              │
│  ┌─────────────────────────────────┐   │
│  │ 예: 챗봇 서비스 개발용           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  필요 기능 선택                         │
│  ┌────────────────┐ ┌────────────────┐ │
│  │ ✅ Chat (GPT)  │ │ ⬜ 이미지 생성 │ │
│  │ ChatGPT 대화   │ │ DALL-E        │ │
│  └────────────────┘ └────────────────┘ │
│  ┌────────────────┐ ┌────────────────┐ │
│  │ ⬜ 이미지 분석 │ │ ⬜ 음성 인식   │ │
│  │ GPT-4 Vision  │ │ Whisper       │ │
│  └────────────────┘ └────────────────┘ │
│  ┌────────────────┐ ┌────────────────┐ │
│  │ ⬜ 음성 합성   │ │ ⬜ 임베딩      │ │
│  │ TTS           │ │ 텍스트 임베딩  │ │
│  └────────────────┘ └────────────────┘ │
│                                         │
│  필요 모델                              │
│  [gpt-4.1] [gpt-4.1-mini]               │
│                                         │
│       [ 취소 ]    [ 신청 ]              │
└─────────────────────────────────────────┘
```

### 1.3 기능별 설명

| 기능 | 설명 | 용도 예시 |
|------|------|----------|
| **Chat (GPT)** | ChatGPT 대화 API | 챗봇, 텍스트 생성, 요약 |
| **이미지 생성** | DALL-E 이미지 생성 | 썸네일, 아이콘 생성 |
| **이미지 분석** | GPT-4 Vision | 이미지 내용 분석, OCR |
| **음성 인식** | Whisper (음성→텍스트) | 회의록 자동 작성, STT |
| **음성 합성** | TTS (텍스트→음성) | 음성 안내, 오디오북 |
| **임베딩** | 텍스트 벡터화 | 검색, 유사도 분석 |

### 1.4 신청 후

- 신청 상태는 **[대기중]** → **[승인됨]** / **[거절됨]** 으로 변경됩니다
- 승인되면 API 키가 자동으로 발급됩니다
- 발급된 키는 **한 번만** 확인 가능하니 반드시 저장하세요!

---

## 2. 발급받은 키 확인하기

### 2.1 키 목록 화면

**[API 키]** 메뉴에서 내 팀의 발급된 키를 확인할 수 있습니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  내 API 키 목록                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 키 프리픽스         │ 상태   │ 허용 기능   │ 월 한도     │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ team-sk-a1b2...     │ [활성] │ [chat]      │ $100       │ │
│  │ team-sk-e5f6...     │ [활성] │ [chat]      │ $50        │ │
│  │                     │        │ [image]     │            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 키 정보 확인

| 항목 | 설명 |
|------|------|
| **키 프리픽스** | 키의 앞부분 (전체 키는 발급 시에만 확인 가능) |
| **상태** | `활성` - 사용 가능 / `폐기됨` - 사용 불가 |
| **허용 기능** | 이 키로 사용 가능한 기능 |
| **월 한도** | 이 키의 월간 사용 한도 (USD) |

⚠️ **중요**: 전체 API 키는 **발급 시점에만** 확인할 수 있습니다. 반드시 안전한 곳에 저장하세요!

---

## 3. 키 분실 시 조회 요청하기

키를 분실한 경우, 관리자에게 키 조회를 요청할 수 있습니다.

### 3.1 키 조회 요청

**[API 키]** 메뉴에서 해당 키의 **[ 🔍 키 조회 요청 ]** 버튼을 클릭합니다.

```
┌─────────────────────────────────────────┐
│  API 키 조회 요청                  [X]  │
├─────────────────────────────────────────┤
│                                         │
│  대상 키: team-sk-a1b2...               │
│                                         │
│  요청 사유                              │
│  ┌─────────────────────────────────┐   │
│  │ 예: 키를 분실하여 재확인 필요    │   │
│  └─────────────────────────────────┘   │
│                                         │
│       [ 취소 ]    [ 요청 ]              │
└─────────────────────────────────────────┘
```

### 3.2 요청 처리 후

- 관리자가 승인하면 **키 조회** 버튼이 활성화됩니다
- 승인된 키 조회는 **1회만** 가능합니다
- 조회 후에는 다시 요청해야 합니다

---

## 4. API 호출하기

발급받은 키로 OpenAI API를 호출하는 방법입니다.

### 4.1 Gateway 주소

```
환경 변수 VITE_GATEWAY_URL로 설정된 Gateway URL을 사용하세요.
예: https://your-gateway-domain.com
```

### 4.2 Chat API 호출 (GPT 대화)

```bash
curl -X POST ${VITE_GATEWAY_URL:-https://your-gateway-domain.com}/v1/chat/completions \
  -H "Authorization: Bearer team-sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "안녕하세요!"}
    ]
  }'
```

### 4.3 이미지 생성 (DALL-E)

```bash
curl -X POST ${VITE_GATEWAY_URL:-https://your-gateway-domain.com}/v1/images/generations \
  -H "Authorization: Bearer team-sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "귀여운 고양이 일러스트",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 4.4 음성 합성 (TTS)

```bash
curl -X POST ${VITE_GATEWAY_URL:-https://your-gateway-domain.com}/v1/audio/speech \
  -H "Authorization: Bearer team-sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "안녕하세요, 반갑습니다!",
    "voice": "alloy"
  }' \
  --output speech.mp3
```

### 4.5 Python 예제

```python
import openai

# Gateway 주소로 설정 (환경 변수 사용 권장)
import os
client = openai.OpenAI(
    api_key="team-sk-your-api-key",
    base_url=os.getenv("GATEWAY_URL", "https://your-gateway-domain.com") + "/v1"
)

# Chat 호출
response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {"role": "user", "content": "안녕하세요!"}
    ]
)

print(response.choices[0].message.content)
```

### 4.6 TypeScript 예제 (openai 패키지)

```typescript
import OpenAI from 'openai';

// Gateway 주소로 설정 (환경 변수 사용 권장)
const client = new OpenAI({
  apiKey: 'team-sk-your-api-key',
  baseURL: (process.env.VITE_GATEWAY_URL || 'https://your-gateway-domain.com') + '/v1',
});

async function main() {
  // Chat 호출
  const response = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'user', content: '안녕하세요!' }
    ],
  });

  console.log(response.choices[0].message.content);
}

main();
```

> 💡 설치: `npm install openai`

### 4.7 TypeScript 예제 (fetch 사용)

```typescript
// openai 패키지 없이 fetch로 직접 호출
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://your-gateway-domain.com';

async function chatWithGPT(message: string): Promise<string> {
  const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer team-sk-your-api-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: message }],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// 사용 예시
const answer = await chatWithGPT('안녕하세요!');
console.log(answer);
```

### 4.8 사용 가능한 엔드포인트

| 기능 | Method | Path |
|------|--------|------|
| Chat (GPT) | POST | `/v1/chat/completions` |
| 이미지 생성 | POST | `/v1/images/generations` |
| 이미지 분석 | POST | `/v1/chat/completions` (이미지 URL 포함) |
| 음성 인식 | POST | `/v1/audio/transcriptions` |
| 음성 합성 | POST | `/v1/audio/speech` |
| 임베딩 | POST | `/v1/embeddings` |

---

## 5. 에러 해결

### 5.1 자주 발생하는 에러

| 에러 코드 | 메시지 | 해결 방법 |
|----------|--------|----------|
| **401** | Unauthorized | API 키가 올바른지 확인하세요 |
| **403** | Feature not allowed | 해당 기능이 허용되지 않은 키입니다. 관리자에게 문의하세요 |
| **403** | Model not allowed | 해당 모델이 허용되지 않은 키입니다. 관리자에게 문의하세요 |
| **403** | Budget exceeded | 월 한도를 초과했습니다. 관리자에게 문의하세요 |

### 5.2 키가 작동하지 않을 때

1. **키 상태 확인**: [API 키] 메뉴에서 키가 `활성` 상태인지 확인
2. **허용 기능 확인**: 사용하려는 기능이 허용되어 있는지 확인
3. **허용 모델 확인**: 사용하려는 모델이 허용되어 있는지 확인
4. **월 한도 확인**: 월 사용량이 한도를 초과하지 않았는지 확인

### 5.3 새 키가 필요한 경우

- 키가 폐기된 경우
- 다른 기능이 필요한 경우
- 한도 증액이 필요한 경우

→ **[ + 키 발급 신청 ]** 버튼으로 새 키를 요청하세요

---

## 6. 문의

문제가 해결되지 않으면 관리자에게 문의하세요.

📧 **정예진** (jyj9975@neungyule.com)

---

*마지막 업데이트: 2025-01*
