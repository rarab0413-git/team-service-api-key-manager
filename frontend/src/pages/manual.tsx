import { useState } from 'react';
import { 
  Book, 
  Key, 
  Send, 
  Eye, 
  Code2, 
  AlertTriangle,
  MessageSquare,
  ImageIcon,
  Mic,
  Volume2,
  Binary,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '';

// 기능 카드 데이터
const FEATURES = [
  { id: 'chat', icon: MessageSquare, label: 'Chat (GPT)', description: 'ChatGPT 대화 API', example: '챗봇, 텍스트 생성, 요약', color: 'text-blue-400' },
  { id: 'image_generation', icon: ImageIcon, label: '이미지 생성', description: 'DALL-E 이미지 생성', example: '썸네일, 아이콘 생성', color: 'text-purple-400' },
  { id: 'image_vision', icon: Eye, label: '이미지 분석', description: 'GPT-4 Vision', example: '이미지 내용 분석, OCR', color: 'text-pink-400' },
  { id: 'audio_transcription', icon: Mic, label: '음성 인식', description: 'Whisper (음성→텍스트)', example: '회의록 자동 작성, STT', color: 'text-green-400' },
  { id: 'audio_speech', icon: Volume2, label: '음성 합성', description: 'TTS (텍스트→음성)', example: '음성 안내, 오디오북', color: 'text-orange-400' },
  { id: 'embeddings', icon: Binary, label: '임베딩', description: '텍스트 벡터화', example: '검색, 유사도 분석', color: 'text-cyan-400' },
];

// 에러 코드 데이터
const ERROR_CODES = [
  { code: '401', message: 'Unauthorized', solution: 'API 키가 올바른지 확인하세요' },
  { code: '403', message: 'Feature not allowed', solution: '해당 기능이 허용되지 않은 키입니다. 관리자에게 문의하세요' },
  { code: '403', message: 'Model not allowed', solution: '해당 모델이 허용되지 않은 키입니다. 관리자에게 문의하세요' },
  { code: '403', message: 'Budget exceeded', solution: '월 한도를 초과했습니다. 관리자에게 문의하세요' },
];

// 엔드포인트 데이터
const ENDPOINTS = [
  { feature: 'Chat (GPT)', method: 'POST', path: '/v1/chat/completions' },
  { feature: '이미지 생성', method: 'POST', path: '/v1/images/generations' },
  { feature: '이미지 분석', method: 'POST', path: '/v1/chat/completions (이미지 URL 포함)' },
  { feature: '음성 인식', method: 'POST', path: '/v1/audio/transcriptions' },
  { feature: '음성 합성', method: 'POST', path: '/v1/audio/speech' },
  { feature: '임베딩', method: 'POST', path: '/v1/embeddings' },
];

// 코드 블록 컴포넌트
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-surface-900 border border-surface-700 rounded-xl p-4 overflow-x-auto text-sm">
        <code className="text-surface-200 font-mono whitespace-pre">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="복사"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// 섹션 컴포넌트
function Section({ 
  id, 
  title, 
  icon: Icon, 
  children,
  defaultOpen = true 
}: { 
  id: string;
  title: string; 
  icon: typeof Book; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className="scroll-mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 mb-4 group"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-white flex-1 text-left">{title}</h2>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-surface-400 group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-white transition-colors" />
        )}
      </button>
      {isOpen && <div className="space-y-4 pl-13">{children}</div>}
    </div>
  );
}

export function ManualPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Book className="w-8 h-8 text-brand-400" />
          <h1 className="text-3xl font-bold text-white">사용자 매뉴얼</h1>
        </div>
        <p className="text-surface-400">
          팀 API 키를 발급받고 OpenAI API를 호출하는 방법을 안내합니다.
        </p>
      </div>

      {/* 목차 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 목차</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'request', label: '1. 키 발급 요청하기' },
            { id: 'check', label: '2. 발급받은 키 확인' },
            { id: 'lost', label: '3. 키 분실 시 조회 요청' },
            { id: 'api', label: '4. API 호출하기' },
            { id: 'error', label: '5. 에러 해결' },
            { id: 'contact', label: '6. 문의' },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-4 py-2 rounded-lg bg-surface-800/50 hover:bg-brand-600/20 text-surface-300 hover:text-brand-300 transition-all text-sm"
            >
              {item.label}
            </a>
          ))}
        </div>
      </Card>

      {/* Section 1: 키 발급 요청 */}
      <Section id="request" title="1. API 키 발급 요청하기" icon={Send}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">발급 요청 방법</h3>
          <div className="space-y-4">
            <p className="text-surface-300">
              <Badge variant="info">API 키</Badge> 메뉴에서{' '}
              <span className="px-2 py-1 bg-brand-600/20 text-brand-300 rounded-lg text-sm font-medium">
                + 키 발급 신청
              </span>{' '}
              버튼을 클릭합니다.
            </p>

            <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700">
              <p className="text-sm text-surface-400 mb-3">필요 기능 선택:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="p-3 rounded-lg bg-surface-900/50 border border-surface-700"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${feature.color}`} />
                        <span className="text-sm font-medium text-white">{feature.label}</span>
                      </div>
                      <p className="text-xs text-surface-400">{feature.description}</p>
                      <p className="text-xs text-surface-500 mt-1">예: {feature.example}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">신청 후 안내</p>
                <ul className="text-sm text-surface-300 mt-2 space-y-1">
                  <li>• 신청 상태: <Badge variant="warning">대기중</Badge> → <Badge variant="success">승인됨</Badge> / <Badge variant="error">거절됨</Badge></li>
                  <li>• 승인되면 API 키가 자동으로 발급됩니다</li>
                  <li>• 발급된 키는 <strong>한 번만</strong> 확인 가능하니 반드시 저장하세요!</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Section 2: 발급받은 키 확인 */}
      <Section id="check" title="2. 발급받은 키 확인하기" icon={Key}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">키 정보 확인</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">항목</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-700/50">
                  <td className="py-3 px-4 text-white font-medium">키 프리픽스</td>
                  <td className="py-3 px-4 text-surface-300">키의 앞부분 (전체 키는 발급 시에만 확인 가능)</td>
                </tr>
                <tr className="border-b border-surface-700/50">
                  <td className="py-3 px-4 text-white font-medium">상태</td>
                  <td className="py-3 px-4 text-surface-300">
                    <Badge variant="success">활성</Badge> 사용 가능 /{' '}
                    <Badge variant="error">폐기됨</Badge> 사용 불가
                  </td>
                </tr>
                <tr className="border-b border-surface-700/50">
                  <td className="py-3 px-4 text-white font-medium">허용 기능</td>
                  <td className="py-3 px-4 text-surface-300">이 키로 사용 가능한 기능</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white font-medium">월 한도</td>
                  <td className="py-3 px-4 text-surface-300">이 키의 월간 사용 한도 (USD)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30 mt-4">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-surface-300">
              <strong className="text-danger">중요:</strong> 전체 API 키는 <strong>발급 시점에만</strong> 확인할 수 있습니다. 반드시 안전한 곳에 저장하세요!
            </p>
          </div>
        </Card>
      </Section>

      {/* Section 3: 키 분실 시 조회 요청 */}
      <Section id="lost" title="3. 키 분실 시 조회 요청하기" icon={Eye}>
        <Card className="p-6">
          <p className="text-surface-300 mb-4">
            키를 분실한 경우, 관리자에게 키 조회를 요청할 수 있습니다.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
              <h4 className="text-white font-medium mb-2">키 조회 요청 방법</h4>
              <p className="text-sm text-surface-300">
                <Badge variant="info">API 키</Badge> 메뉴에서 해당 키의{' '}
                <span className="px-2 py-1 bg-surface-700 text-surface-300 rounded-lg text-sm">
                  🔍 키 조회 요청
                </span>{' '}
                버튼을 클릭합니다.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
              <h4 className="text-white font-medium mb-2">요청 처리 후</h4>
              <ul className="text-sm text-surface-300 space-y-1">
                <li>• 관리자가 승인하면 <strong>키 조회</strong> 버튼이 활성화됩니다</li>
                <li>• 승인된 키 조회는 <strong>1회만</strong> 가능합니다</li>
                <li>• 조회 후에는 다시 요청해야 합니다</li>
              </ul>
            </div>
          </div>
        </Card>
      </Section>

      {/* Section 4: API 호출하기 */}
      <Section id="api" title="4. API 호출하기" icon={Code2}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Gateway 주소</h3>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-900 border border-brand-500/30 mb-6">
            <code className="text-brand-400 font-mono flex-1">{GATEWAY_URL}</code>
            <a
              href={GATEWAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Chat API 호출 (GPT 대화)</h3>
          <CodeBlock
            code={`curl -X POST ${GATEWAY_URL}/v1/chat/completions \\
  -H "Authorization: Bearer team-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "안녕하세요!"}
    ]
  }'`}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">이미지 생성 (DALL-E)</h3>
          <CodeBlock
            code={`curl -X POST ${GATEWAY_URL}/v1/images/generations \\
  -H "Authorization: Bearer team-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "dall-e-3",
    "prompt": "귀여운 고양이 일러스트",
    "n": 1,
    "size": "1024x1024"
  }'`}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">음성 합성 (TTS)</h3>
          <CodeBlock
            code={`curl -X POST ${GATEWAY_URL}/v1/audio/speech \\
  -H "Authorization: Bearer team-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "tts-1",
    "input": "안녕하세요, 반갑습니다!",
    "voice": "alloy"
  }' \\
  --output speech.mp3`}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Python 예제</h3>
          <CodeBlock
            code={`import openai

# Gateway 주소로 설정
client = openai.OpenAI(
    api_key="team-sk-your-api-key",
    base_url="${GATEWAY_URL}/v1"
)

# Chat 호출
response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {"role": "user", "content": "안녕하세요!"}
    ]
)

print(response.choices[0].message.content)`}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">TypeScript 예제</h3>
          <CodeBlock
            code={`import OpenAI from 'openai';

// Gateway 주소로 설정
const client = new OpenAI({
  apiKey: 'team-sk-your-api-key',
  baseURL: '${GATEWAY_URL}/v1',
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

main();`}
          />
          <p className="text-sm text-surface-400 mt-3">
            💡 설치: <code className="px-2 py-1 bg-surface-800 rounded text-brand-400">npm install openai</code>
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">TypeScript (fetch 사용)</h3>
          <CodeBlock
            code={`// openai 패키지 없이 fetch로 직접 호출
async function chatWithGPT(message: string): Promise<string> {
  const response = await fetch('${GATEWAY_URL}/v1/chat/completions', {
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
console.log(answer);`}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">사용 가능한 엔드포인트</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">기능</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">Path</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint, idx) => (
                  <tr key={idx} className="border-b border-surface-700/50">
                    <td className="py-3 px-4 text-white">{endpoint.feature}</td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{endpoint.method}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-sm text-brand-400">{endpoint.path}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* Section 5: 에러 해결 */}
      <Section id="error" title="5. 에러 해결" icon={AlertTriangle}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">자주 발생하는 에러</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">에러 코드</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">메시지</th>
                  <th className="text-left py-3 px-4 text-surface-400 font-medium">해결 방법</th>
                </tr>
              </thead>
              <tbody>
                {ERROR_CODES.map((error, idx) => (
                  <tr key={idx} className="border-b border-surface-700/50">
                    <td className="py-3 px-4">
                      <Badge variant="error">{error.code}</Badge>
                    </td>
                    <td className="py-3 px-4 text-white">{error.message}</td>
                    <td className="py-3 px-4 text-surface-300">{error.solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">키가 작동하지 않을 때</h3>
          <div className="space-y-3">
            {[
              { step: 1, title: '키 상태 확인', desc: '[API 키] 메뉴에서 키가 활성 상태인지 확인' },
              { step: 2, title: '허용 기능 확인', desc: '사용하려는 기능이 허용되어 있는지 확인' },
              { step: 3, title: '허용 모델 확인', desc: '사용하려는 모델이 허용되어 있는지 확인' },
              { step: 4, title: '월 한도 확인', desc: '월 사용량이 한도를 초과하지 않았는지 확인' },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700"
              >
                <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-sm text-surface-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Section 6: 문의 */}
      <div id="contact" className="scroll-mt-8">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">📞 문의</h2>
          <p className="text-surface-300">
            문제가 해결되지 않으면 조직 내 관리자에게 문의하세요.
          </p>
        </Card>
      </div>
    </div>
  );
}
