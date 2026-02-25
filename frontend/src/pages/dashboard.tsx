import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Key, 
  DollarSign, 
  TrendingUp,
  Activity,
  AlertTriangle,
  Building2,
  MessageSquare,
  Image,
  Eye,
  Mic,
  Volume2,
  Binary
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { teamsApi, apiKeysApi, usageApi, type Team, type ApiKey, type FeatureUsage, type TeamUsage } from '../lib/api';
import { useIsAdmin, useUserTeamId, useUserTeamName, useDbUser } from '../store/auth-store';
import { useAppStore } from '../store/app-store';

// 기능별 아이콘 및 라벨 매핑
const FEATURE_CONFIG: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  chat: { icon: MessageSquare, label: 'Chat (GPT)', color: 'text-blue-400' },
  image_generation: { icon: Image, label: '이미지 생성', color: 'text-purple-400' },
  image_vision: { icon: Eye, label: '이미지 분석', color: 'text-pink-400' },
  audio_transcription: { icon: Mic, label: '음성 인식', color: 'text-green-400' },
  audio_speech: { icon: Volume2, label: '음성 합성', color: 'text-orange-400' },
  embeddings: { icon: Binary, label: '임베딩', color: 'text-cyan-400' },
};

// 관리자용 대시보드
function AdminDashboard() {
  const { selectedTeamId } = useAppStore();
  
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeysApi.getAll,
  });

  // 전체 팀의 이번 달 사용량 조회
  const { data: allTeamsUsage = [] } = useQuery({
    queryKey: ['usage', 'allTeams', 'currentMonth'],
    queryFn: usageApi.getAllTeamsCurrentMonth,
  });

  // 전체 기능별 사용량 조회 (팀 미선택 시)
  const { data: allFeatureUsage = [] } = useQuery({
    queryKey: ['usage', 'allTeams', 'currentMonth', 'byFeature'],
    queryFn: usageApi.getAllTeamsCurrentMonthByFeature,
    enabled: !selectedTeamId,
  });

  // 선택된 팀의 기능별 사용량 조회
  const { data: teamFeatureUsage = [] } = useQuery({
    queryKey: ['usage', 'team', selectedTeamId, 'currentMonth', 'byFeature'],
    queryFn: () => usageApi.getCurrentMonthByFeature(selectedTeamId!),
    enabled: !!selectedTeamId,
  });

  // 현재 표시할 기능별 사용량
  const featureUsage = selectedTeamId ? teamFeatureUsage : allFeatureUsage;

  // 팀 필터 적용
  const filteredTeams = selectedTeamId 
    ? teams.filter((t: Team) => t.id === selectedTeamId)
    : teams;
  
  const filteredApiKeys = selectedTeamId
    ? apiKeys.filter((k: ApiKey) => k.teamId === selectedTeamId)
    : apiKeys;
  
  const filteredUsage = selectedTeamId
    ? allTeamsUsage.filter((u: TeamUsage) => u.teamId === selectedTeamId)
    : allTeamsUsage;

  const activeKeys = filteredApiKeys.filter((k: ApiKey) => k.status === 'active').length;
  const totalBudget = filteredTeams.reduce((sum: number, t: Team) => sum + t.monthlyBudget, 0);
  
  // 전체 사용량 합계
  const totalUsage = filteredUsage.reduce((sum: number, u: TeamUsage) => sum + u.totalCostUsd, 0);

  // 팀별 사용량 매핑 (팀 이름 포함)
  const teamsWithUsage = filteredTeams.map((team: Team) => {
    const usage = allTeamsUsage.find((u: TeamUsage) => u.teamId === team.id);
    return {
      ...team,
      currentUsage: usage?.totalCostUsd || 0,
    };
  }).sort((a, b) => b.currentUsage - a.currentUsage); // 사용량 높은 순 정렬

  // 선택된 팀 이름
  const selectedTeamName = selectedTeamId 
    ? teams.find((t: Team) => t.id === selectedTeamId)?.name 
    : null;

  const stats = [
    {
      label: selectedTeamId ? '선택된 팀' : '등록된 팀',
      value: selectedTeamId ? selectedTeamName : teams.length,
      icon: Users,
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10',
    },
    {
      label: '활성 API 키',
      value: activeKeys,
      icon: Key,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: '총 월간 예산',
      value: `$${totalBudget.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: '이번 달 전체 사용량',
      value: `$${totalUsage.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">대시보드</h1>
        <p className="text-surface-400 mt-1">API Gateway 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className="p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-surface-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature Usage Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {selectedTeamId ? `${selectedTeamName} 기능별 사용량` : '전체 기능별 사용량'}
            </h2>
            <p className="text-sm text-surface-400 mt-1">이번 달 기능별 API 사용 현황</p>
          </div>
          <Activity className="w-5 h-5 text-brand-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(FEATURE_CONFIG).map(([featureType, config]) => {
            const usage = featureUsage.find((u: FeatureUsage) => u.featureType === featureType);
            const Icon = config.icon;
            return (
              <div 
                key={featureType}
                className="p-4 bg-surface-800/30 rounded-xl text-center"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl bg-surface-700/50 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <p className="text-xs text-surface-400 mb-1">{config.label}</p>
                <p className="text-lg font-semibold text-white">
                  ${(usage?.totalCostUsd || 0).toFixed(4)}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  {usage?.requestCount || 0}회 요청
                </p>
              </div>
            );
          })}
        </div>
        {featureUsage.length === 0 && (
          <div className="text-center py-8 text-surface-400">
            이번 달 사용 내역이 없습니다
          </div>
        )}
      </Card>

      {/* Team Usage Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">팀별 이번 달 사용량</h2>
            <p className="text-sm text-surface-400 mt-1">사용량이 높은 순서로 정렬됩니다</p>
          </div>
          <TrendingUp className="w-5 h-5 text-purple-400" />
        </div>
        <div className="space-y-3">
          {teamsWithUsage.map((team) => {
            const usagePercent = team.monthlyBudget > 0 
              ? (team.currentUsage / team.monthlyBudget) * 100 
              : 0;
            const isOverBudget = usagePercent > 100;
            const isWarning = usagePercent > 80;
            
            return (
              <div 
                key={team.id} 
                className="p-4 bg-surface-800/30 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-700/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-brand-400" />
                    </div>
                    <span className="font-medium text-white">{team.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${isOverBudget ? 'text-danger' : isWarning ? 'text-warning' : 'text-white'}`}>
                      ${team.currentUsage.toFixed(2)}
                    </span>
                    <span className="text-surface-400"> / ${team.monthlyBudget}</span>
                  </div>
                </div>
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isOverBudget ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-surface-500">
                    {usagePercent.toFixed(1)}% 사용
                  </span>
                  <span className="text-xs text-surface-500">
                    남은 예산: ${Math.max(0, team.monthlyBudget - team.currentUsage).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredTeams.length === 0 && (
            <div className="text-center py-8 text-surface-400">
              {selectedTeamId ? '선택된 팀이 없습니다' : '등록된 팀이 없습니다'}
            </div>
          )}
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Teams */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              {selectedTeamId ? '선택된 팀' : '최근 등록된 팀'}
            </h2>
            <Activity className="w-5 h-5 text-surface-400" />
          </div>
          <div className="space-y-4">
            {filteredTeams.slice(0, 5).map((team: Team) => (
              <div 
                key={team.id} 
                className="flex items-center justify-between py-3 border-b border-surface-700/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{team.name}</p>
                    <p className="text-sm text-surface-400">
                      월 예산: ${team.monthlyBudget.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="success">활성</Badge>
              </div>
            ))}
            {filteredTeams.length === 0 && (
              <div className="text-center py-8 text-surface-400">
                {selectedTeamId ? '선택된 팀이 없습니다' : '등록된 팀이 없습니다'}
              </div>
            )}
          </div>
        </Card>

        {/* Recent API Keys */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              {selectedTeamId ? '팀 API 키' : '최근 발급된 API 키'}
            </h2>
            <Key className="w-5 h-5 text-surface-400" />
          </div>
          <div className="space-y-4">
            {filteredApiKeys.slice(0, 5).map((key: ApiKey) => (
              <div 
                key={key.id} 
                className="flex items-center justify-between py-3 border-b border-surface-700/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-white">{key.keyPrefix}...</p>
                    <p className="text-sm text-surface-400">{key.teamName || `Team #${key.teamId}`}</p>
                  </div>
                </div>
                <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
                  {key.status === 'active' ? '활성' : '비활성'}
                </Badge>
              </div>
            ))}
            {filteredApiKeys.length === 0 && (
              <div className="text-center py-8 text-surface-400">
                {selectedTeamId ? '이 팀의 API 키가 없습니다' : '발급된 API 키가 없습니다'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Gateway Info */}
      <GatewayInfoCard />
    </div>
  );
}

// 일반 사용자용 대시보드
function UserDashboard() {
  const teamId = useUserTeamId();
  const teamName = useUserTeamName();
  const dbUser = useDbUser();

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['apiKeys', teamId],
    queryFn: () => teamId ? apiKeysApi.getByTeam(teamId) : Promise.resolve([]),
    enabled: !!teamId,
  });

  const { data: currentMonthUsage } = useQuery({
    queryKey: ['usage', 'currentMonth', teamId],
    queryFn: () => teamId ? usageApi.getCurrentMonth(teamId) : Promise.resolve(null),
    enabled: !!teamId,
  });

  // 기능별 사용량 조회
  const { data: featureUsage = [] } = useQuery({
    queryKey: ['usage', 'byFeature', teamId],
    queryFn: () => teamId ? usageApi.getCurrentMonthByFeature(teamId) : Promise.resolve([]),
    enabled: !!teamId,
  });

  const activeKeys = apiKeys.filter((k: ApiKey) => k.status === 'active').length;
  const monthlyBudget = dbUser?.teamMonthlyBudget || 0;
  const currentUsage = currentMonthUsage?.currentMonthUsageUsd || 0;

  const stats = [
    {
      label: '팀 월간 예산',
      value: `$${monthlyBudget.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: '이번 달 사용량',
      value: `$${currentUsage.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: '활성 API 키',
      value: activeKeys,
      icon: Key,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">대시보드</h1>
        <div className="flex items-center gap-2 mt-1">
          <Building2 className="w-4 h-4 text-brand-400" />
          <p className="text-surface-400">
            <span className="text-brand-400 font-medium">{teamName}</span> 팀의 API Gateway 현황
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className="p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-surface-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Budget Usage Bar */}
      {monthlyBudget > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">예산 사용 현황</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">사용량</span>
              <span className="text-white">${currentUsage.toFixed(2)} / ${monthlyBudget.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (currentUsage / monthlyBudget) > 0.9 ? 'bg-danger' :
                  (currentUsage / monthlyBudget) > 0.7 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min((currentUsage / monthlyBudget) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-surface-500">
              남은 예산: ${(monthlyBudget - currentUsage).toFixed(2)}
            </p>
          </div>
        </Card>
      )}

      {/* Feature Usage */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">기능별 사용량 (이번 달)</h2>
          <Activity className="w-5 h-5 text-surface-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(FEATURE_CONFIG).map(([featureType, config]) => {
            const usage = featureUsage.find((u: FeatureUsage) => u.featureType === featureType);
            const Icon = config.icon;
            return (
              <div 
                key={featureType}
                className="p-4 bg-surface-800/30 rounded-xl text-center"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl bg-surface-700/50 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <p className="text-xs text-surface-400 mb-1">{config.label}</p>
                <p className="text-lg font-semibold text-white">
                  ${(usage?.totalCostUsd || 0).toFixed(4)}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  {usage?.requestCount || 0}회 요청
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legacy Feature Usage - 사용 내역이 있는 경우 상세 표시 */}
      {featureUsage.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">기능별 상세 현황</h2>
            <Activity className="w-5 h-5 text-surface-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureUsage.map((usage: FeatureUsage) => {
              const config = FEATURE_CONFIG[usage.featureType] || { 
                icon: Activity, 
                label: usage.featureType, 
                color: 'text-surface-400' 
              };
              const Icon = config.icon;
              return (
                <div 
                  key={usage.featureType}
                  className="p-4 bg-surface-800/50 rounded-xl border border-surface-700/50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-surface-700/50`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <span className="font-medium text-white">{config.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">비용</span>
                      <span className="text-white font-medium">${usage.totalCostUsd.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-400">요청 수</span>
                      <span className="text-surface-200">{usage.requestCount.toLocaleString()}건</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent API Keys */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">팀 API 키 목록</h2>
          <Key className="w-5 h-5 text-surface-400" />
        </div>
        <div className="space-y-4">
          {apiKeys.slice(0, 5).map((key: ApiKey) => (
            <div 
              key={key.id} 
              className="flex items-center justify-between py-3 border-b border-surface-700/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-mono text-sm text-white">{key.keyPrefix}...</p>
                  <p className="text-sm text-surface-400">
                    한도: ${key.monthlyLimitUsd} | 발급: {new Date(key.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
                {key.status === 'active' ? '활성' : '비활성'}
              </Badge>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <div className="text-center py-8 text-surface-400">
              발급된 API 키가 없습니다
            </div>
          )}
        </div>
      </Card>

      {/* Gateway Info */}
      <GatewayInfoCard />
    </div>
  );
}

// Gateway 사용 안내 카드 (공통)
function GatewayInfoCard() {
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'tts' | 'stt' | 'embedding'>('chat');

  const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://your-gateway-domain.com';

  const examples = {
    chat: {
      title: 'Chat Completions',
      endpoint: 'POST /v1/chat/completions',
      model: 'gpt-4, gpt-4o, gpt-4.1 등',
      code: `curl -X POST ${GATEWAY_URL}/v1/chat/completions \\
  -H "Authorization: Bearer team-sk-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
    },
    image: {
      title: '이미지 생성 (DALL-E)',
      endpoint: 'POST /v1/images/generations',
      model: 'dall-e-3, dall-e-2',
      code: `curl -X POST ${GATEWAY_URL}/v1/images/generations \\
  -H "Authorization: Bearer team-sk-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "dall-e-3",
    "prompt": "A cute baby sea otter",
    "n": 1,
    "size": "1024x1024"
  }'`,
    },
    tts: {
      title: '음성 합성 (TTS)',
      endpoint: 'POST /v1/audio/speech',
      model: 'tts-1, tts-1-hd',
      code: `curl -X POST ${GATEWAY_URL}/v1/audio/speech \\
  -H "Authorization: Bearer team-sk-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "tts-1",
    "input": "안녕하세요, 반갑습니다.",
    "voice": "alloy"
  }' --output speech.mp3`,
    },
    stt: {
      title: '음성 인식 (Whisper)',
      endpoint: 'POST /v1/audio/transcriptions',
      model: 'whisper-1',
      code: `curl -X POST ${GATEWAY_URL}/v1/audio/transcriptions \\
  -H "Authorization: Bearer team-sk-xxxxxxxx" \\
  -F file="@audio.mp3" \\
  -F model="whisper-1"`,
    },
    embedding: {
      title: '임베딩',
      endpoint: 'POST /v1/embeddings',
      model: 'text-embedding-3-small, text-embedding-3-large',
      code: `curl -X POST ${GATEWAY_URL}/v1/embeddings \\
  -H "Authorization: Bearer team-sk-xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": "The quick brown fox jumps over the lazy dog"
  }'`,
    },
  };

  const current = examples[activeTab];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-brand-500/10">
          <AlertTriangle className="w-6 h-6 text-brand-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-2">Gateway 사용 안내</h3>
          <p className="text-surface-400 text-sm mb-4">
            팀별로 발급된 API 키를 사용하여 OpenAI API를 호출할 수 있습니다.
            실제 OpenAI API 키는 게이트웨이에만 보관되며, 팀에게는 노출되지 않습니다.
          </p>
          
          {/* 탭 버튼 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(examples).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                {val.title}
              </button>
            ))}
          </div>

          {/* 현재 선택된 예시 */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-surface-500">엔드포인트:</span>
              <code className="text-brand-400">{current.endpoint}</code>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-surface-500">지원 모델:</span>
              <span className="text-surface-300">{current.model}</span>
            </div>
          </div>

          <div className="code-block overflow-x-auto">
            <pre className="text-brand-300 text-sm whitespace-pre">{current.code}</pre>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const isAdmin = useIsAdmin();  if (isAdmin) {
    return <AdminDashboard />;
  }  return <UserDashboard />;
}