import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  Plus, 
  Copy, 
  Ban,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Clock,
  Send
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Badge } from '../components/ui/badge';
import { teamsApi, apiKeysApi, keyRequestsApi, keyIssueRequestsApi, type Team, type ApiKey, type KeyRequest, type KeyIssueRequest } from '../lib/api';
import { useAppStore } from '../store/app-store';
import { useIsAdmin, useUserTeamId, useUserTeamName, useAuthStore } from '../store/auth-store';

const AVAILABLE_FEATURES = [
  { id: 'chat', label: 'Chat (GPT)', description: 'ChatGPT 대화 API' },
  { id: 'image_generation', label: '이미지 생성', description: 'DALL-E 이미지 생성' },
  { id: 'image_vision', label: '이미지 분석', description: 'GPT-4 Vision 이미지 분석' },
  { id: 'audio_transcription', label: '음성 인식', description: 'Whisper 음성→텍스트' },
  { id: 'audio_speech', label: '음성 합성', description: 'TTS 텍스트→음성' },
  { id: 'embeddings', label: '임베딩', description: '텍스트 임베딩 벡터' },
];

// 기능별 허용 모델 매핑
const MODELS_BY_FEATURE: Record<string, string[]> = {
  chat: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  image_generation: ['dall-e-3', 'dall-e-2'],
  image_vision: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  audio_transcription: ['whisper-1'],
  audio_speech: ['tts-1', 'tts-1-hd'],
  embeddings: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
};

// 기능별 기본 선택 모델
const DEFAULT_MODELS_BY_FEATURE: Record<string, string[]> = {
  chat: ['gpt-4.1', 'gpt-4.1-mini'],
  image_generation: ['dall-e-3'],
  image_vision: ['gpt-4o'],
  audio_transcription: ['whisper-1'],
  audio_speech: ['tts-1'],
  embeddings: ['text-embedding-3-small'],
};

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { modalOpen, openModal, closeModal, selectedTeamId } = useAppStore();
  const isAdmin = useIsAdmin();
  const userTeamId = useUserTeamId();
  const userTeamName = useUserTeamName();
  const { sharedUser, firebaseUser, dbUser } = useAuthStore();
  const userEmail = dbUser?.email || firebaseUser?.email || sharedUser?.email || '';
  
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    teamId: '',
    monthlyLimitUsd: '100',
    allowedModels: ['gpt-4.1', 'gpt-4.1-mini'],
    allowedFeature: 'chat', // 단일 선택으로 변경
  });
  // 키 발급 신청용 폼 데이터
  const [issueRequestFormData, setIssueRequestFormData] = useState({
    monthlyLimitUsd: '100',
    allowedModels: ['gpt-4.1', 'gpt-4.1-mini'],
    allowedFeature: 'chat',
  });

  // 관리자: 모든 팀 조회, 일반 사용자: 팀 조회 불필요
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
    enabled: isAdmin,
  });

  // 관리자: 모든 키 조회, 일반 사용자: 본인 팀 키만 조회
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['apiKeys', isAdmin ? 'all' : userTeamId],
    queryFn: () => {
      if (isAdmin) {
        return apiKeysApi.getAll();
      }
      return userTeamId ? apiKeysApi.getByTeam(userTeamId) : Promise.resolve([]);
    },
  });

  // 내 키 조회 요청 목록 (일반 사용자용)
  const { data: myKeyRequests = [] } = useQuery({
    queryKey: ['myKeyRequests', userEmail],
    queryFn: () => keyRequestsApi.getMyRequests(userEmail),
    enabled: !isAdmin && !!userEmail,
  });

  // 내 키 발급 신청 목록 (일반 사용자용)
  const { data: myKeyIssueRequests = [] } = useQuery({
    queryKey: ['myKeyIssueRequests', userEmail],
    queryFn: () => keyIssueRequestsApi.getMyRequests(userEmail),
    enabled: !isAdmin && !!userEmail,
  });

  // 특정 API 키에 대한 내 요청 상태 확인
  const getMyRequestForKey = (apiKeyId: number): KeyRequest | undefined => {
    return myKeyRequests.find(
      (r: KeyRequest) => r.apiKeyId === apiKeyId && (r.status === 'pending' || r.status === 'approved')
    );
  };

  // 관리자: 선택된 팀으로 필터, 일반 사용자: 필터 불필요 (이미 본인 팀만)
  const filteredKeys = isAdmin && selectedTeamId 
    ? apiKeys.filter((k: ApiKey) => k.teamId === selectedTeamId)
    : apiKeys;

  const createMutation = useMutation({
    mutationFn: (data: { teamId: number; allowedModels?: string[]; allowedFeatures?: string[]; monthlyLimitUsd?: number }) => 
      apiKeysApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  // 키 조회 요청 생성
  const requestKeyMutation = useMutation({
    mutationFn: (apiKeyId: number) => keyRequestsApi.create(apiKeyId, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myKeyRequests'] });
    },
  });

  // 키 확인 (1회성)
  const revealKeyMutation = useMutation({
    mutationFn: (requestId: number) => keyRequestsApi.reveal(requestId, userEmail),
    onSuccess: (data) => {
      setRevealedApiKey(data.apiKey);
      openModal('revealKey');
      queryClient.invalidateQueries({ queryKey: ['myKeyRequests'] });
    },
  });

  // 키 발급 신청 생성
  const createIssueRequestMutation = useMutation({
    mutationFn: (data: { teamId: number; allowedFeature: string; allowedModels: string[]; monthlyLimitUsd: number }) =>
      keyIssueRequestsApi.create(data, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myKeyIssueRequests'] });
      closeModal('createIssueRequest');
      setIssueRequestFormData({
        monthlyLimitUsd: '100',
        allowedModels: DEFAULT_MODELS_BY_FEATURE['chat'],
        allowedFeature: 'chat',
      });
    },
  });

  // 키 발급 신청 승인 후 키 열람 (1회성)
  const revealIssueKeyMutation = useMutation({
    mutationFn: (requestId: number) => keyIssueRequestsApi.reveal(requestId, userEmail),
    onSuccess: (data) => {
      setRevealedApiKey(data.apiKey);
      openModal('revealKey');
      queryClient.invalidateQueries({ queryKey: ['myKeyIssueRequests'] });
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const handleCreate = () => {
    // 관리자: 선택된 팀, 일반 사용자: 본인 팀
    const teamId = isAdmin ? parseInt(formData.teamId) : userTeamId;
    if (!teamId) return;
    
    createMutation.mutate({
      teamId,
      allowedModels: formData.allowedModels,
      allowedFeatures: [formData.allowedFeature], // 단일 값을 배열로 전달
      monthlyLimitUsd: parseFloat(formData.monthlyLimitUsd),
    });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = (id: number) => {
    if (confirm('정말 이 API 키를 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      revokeMutation.mutate(id);
    }
  };

  const toggleModel = (model: string) => {
    setFormData(prev => ({
      ...prev,
      allowedModels: prev.allowedModels.includes(model)
        ? prev.allowedModels.filter(m => m !== model)
        : [...prev.allowedModels, model],
    }));
  };

  const selectFeature = (feature: string) => {
    // 기능 변경 시 해당 기능에 맞는 기본 모델로 변경
    setFormData(prev => ({
      ...prev,
      allowedFeature: feature,
      allowedModels: DEFAULT_MODELS_BY_FEATURE[feature] || ['gpt-4.1'],
    }));
  };

  // 키 발급 신청용 핸들러
  const handleCreateIssueRequest = () => {
    if (!userTeamId) return;
    createIssueRequestMutation.mutate({
      teamId: userTeamId,
      allowedFeature: issueRequestFormData.allowedFeature,
      allowedModels: issueRequestFormData.allowedModels,
      monthlyLimitUsd: parseFloat(issueRequestFormData.monthlyLimitUsd),
    });
  };

  const toggleIssueRequestModel = (model: string) => {
    setIssueRequestFormData(prev => ({
      ...prev,
      allowedModels: prev.allowedModels.includes(model)
        ? prev.allowedModels.filter(m => m !== model)
        : [...prev.allowedModels, model],
    }));
  };

  const selectIssueRequestFeature = (feature: string) => {
    setIssueRequestFormData(prev => ({
      ...prev,
      allowedFeature: feature,
      allowedModels: DEFAULT_MODELS_BY_FEATURE[feature] || ['gpt-4.1'],
    }));
  };

  // 현재 선택된 기능에 맞는 모델 목록 (발급 신청용)
  const availableIssueRequestModels = MODELS_BY_FEATURE[issueRequestFormData.allowedFeature] || [];

  const closeCreateModal = () => {
    closeModal('createApiKey');
    setNewApiKey(null);
    setFormData({
      teamId: '',
      monthlyLimitUsd: '100',
      allowedModels: DEFAULT_MODELS_BY_FEATURE['chat'],
      allowedFeature: 'chat',
    });
  };

  // 현재 선택된 기능에 맞는 모델 목록
  const availableModels = MODELS_BY_FEATURE[formData.allowedFeature] || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">API 키 관리</h1>
          {isAdmin ? (
            <p className="text-surface-400 mt-1">팀별 API 키를 발급하고 관리합니다</p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-brand-400" />
              <p className="text-surface-400">
                <span className="text-brand-400 font-medium">{userTeamName}</span> 팀의 API 키
              </p>
            </div>
          )}
        </div>
        {/* 관리자: 발급 버튼, 일반 사용자: 발급 신청 버튼 */}
        {isAdmin ? (
          <Button onClick={() => openModal('createApiKey')}>
            <Plus className="w-4 h-4" />
            새 API 키 발급
          </Button>
        ) : (
          <Button onClick={() => openModal('createIssueRequest')}>
            <Send className="w-4 h-4" />
            키 발급 신청
          </Button>
        )}
      </div>

      {/* Filter Info - 관리자만 */}
      {isAdmin && selectedTeamId && (
        <Card className="p-4 flex items-center gap-3 bg-brand-500/10 border-brand-500/30">
          <AlertCircle className="w-5 h-5 text-brand-400" />
          <span className="text-surface-200">
            선택된 팀의 API 키만 표시됩니다. 전체 키를 보려면 사이드바에서 팀 선택을 해제하세요.
          </span>
        </Card>
      )}

      {/* API Keys Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  키 프리픽스
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  팀
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  허용 기능
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  허용 모델
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  월 한도
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  발급일
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {filteredKeys.map((key: ApiKey) => (
                <tr key={key.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-brand-300">{key.keyPrefix}...</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{key.teamName || `Team #${key.teamId}`}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
                      {key.status === 'active' ? '활성' : '폐기됨'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="success">
                      {AVAILABLE_FEATURES.find(f => f.id === (key.allowedFeatures?.[0] || 'chat'))?.label || key.allowedFeatures?.[0] || 'chat'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.allowedModels.slice(0, 2).map((model: string) => (
                        <Badge key={model} variant="default">{model}</Badge>
                      ))}
                      {key.allowedModels.length > 2 && (
                        <Badge variant="default">+{key.allowedModels.length - 2}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">${key.monthlyLimitUsd}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-surface-300">
                      {new Date(key.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* 관리자: 폐기 버튼 */}
                      {isAdmin && key.status === 'active' && (
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleRevoke(key.id)}
                        >
                          <Ban className="w-4 h-4" />
                          폐기
                        </Button>
                      )}
                      
                      {/* 일반 사용자: 키 조회 요청/확인 버튼 */}
                      {!isAdmin && key.status === 'active' && (() => {
                        const myRequest = getMyRequestForKey(key.id);
                        
                        if (!myRequest) {
                          // 요청 없음 - 요청 버튼 표시
                          return (
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => requestKeyMutation.mutate(key.id)}
                              disabled={requestKeyMutation.isPending}
                            >
                              <Send className="w-4 h-4" />
                              키 조회 요청
                            </Button>
                          );
                        } else if (myRequest.status === 'pending') {
                          // 대기중
                          return (
                            <Badge variant="warning" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              승인 대기중
                            </Badge>
                          );
                        } else if (myRequest.status === 'approved') {
                          // 승인됨 - 확인 버튼 표시
                          return (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => revealKeyMutation.mutate(myRequest.id)}
                              disabled={revealKeyMutation.isPending}
                            >
                              <Eye className="w-4 h-4" />
                              키 확인 (1회)
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="text-center py-12 text-surface-400">
              로딩 중...
            </div>
          )}

          {!isLoading && filteredKeys.length === 0 && (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-400">발급된 API 키가 없습니다</p>
              {isAdmin ? (
                <Button 
                  className="mt-4"
                  onClick={() => openModal('createApiKey')}
                >
                  <Plus className="w-4 h-4" />
                  첫 번째 API 키 발급하기
                </Button>
              ) : (
                <Button 
                  className="mt-4"
                  onClick={() => openModal('createIssueRequest')}
                >
                  <Send className="w-4 h-4" />
                  키 발급 신청하기
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 일반 사용자: 내 키 발급 신청 목록 */}
      {!isAdmin && myKeyIssueRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">내 키 발급 신청</h2>
          <div className="space-y-3">
            {myKeyIssueRequests.map((request: KeyIssueRequest) => (
              <div 
                key={request.id} 
                className="p-4 bg-surface-800/50 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {AVAILABLE_FEATURES.find(f => f.id === request.allowedFeature)?.label || request.allowedFeature}
                    </span>
                    <Badge 
                      variant={
                        request.status === 'pending' ? 'warning' :
                        request.status === 'approved' ? 'success' :
                        request.status === 'issued' ? 'default' : 'danger'
                      }
                    >
                      {request.status === 'pending' ? '승인 대기중' :
                       request.status === 'approved' ? '승인됨 (열람 가능)' :
                       request.status === 'issued' ? '발급 완료' : '거절됨'}
                    </Badge>
                  </div>
                  <div className="text-sm text-surface-400">
                    월 한도: ${request.monthlyLimitUsd} | 모델: {request.allowedModels.slice(0, 2).join(', ')}
                    {request.allowedModels.length > 2 && ` 외 ${request.allowedModels.length - 2}개`}
                  </div>
                  <div className="text-xs text-surface-500">
                    신청일: {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                    {request.keyPrefix && ` | 키: ${request.keyPrefix}...`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {request.status === 'approved' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => revealIssueKeyMutation.mutate(request.id)}
                      disabled={revealIssueKeyMutation.isPending}
                    >
                      <Eye className="w-4 h-4" />
                      키 확인 (1회)
                    </Button>
                  )}
                  {request.status === 'pending' && (
                    <Clock className="w-5 h-5 text-warning" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create API Key Modal */}
      <Modal
        isOpen={modalOpen.createApiKey}
        onClose={closeCreateModal}
        title={newApiKey ? 'API 키 발급 완료' : '새 API 키 발급'}
      >
        {newApiKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
              <div className="flex items-center gap-2 text-success mb-2">
                <Check className="w-5 h-5" />
                <span className="font-semibold">API 키가 발급되었습니다</span>
              </div>
              <p className="text-sm text-surface-300">
                이 키는 다시 확인할 수 없습니다. 반드시 안전한 곳에 저장하세요.
              </p>
            </div>
            
            <div className="relative">
              <div className="code-block pr-20">
                <code className="text-sm break-all">
                  {showKey ? newApiKey : '•'.repeat(40)}
                </code>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(newApiKey)}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={closeCreateModal}>
              완료
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 관리자: 팀 선택, 일반 사용자: 본인 팀 표시 */}
            {isAdmin ? (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  팀 선택
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                >
                  <option value="">팀을 선택하세요</option>
                  {teams.map((team: Team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-surface-800/50 border border-surface-600 rounded-xl">
                <label className="block text-sm font-medium text-surface-400 mb-1">
                  발급 대상 팀
                </label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-400" />
                  <span className="text-white font-medium">{userTeamName}</span>
                </div>
              </div>
            )}

            <Input
              label="월 사용 한도 (USD)"
              type="number"
              placeholder="예: 100"
              value={formData.monthlyLimitUsd}
              onChange={(e) => setFormData({ ...formData, monthlyLimitUsd: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                허용 기능 (1개 선택)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_FEATURES.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => selectFeature(feature.id)}
                    className={`px-3 py-2 text-left text-sm rounded-lg border transition-all ${
                      formData.allowedFeature === feature.id
                        ? 'bg-success/10 border-success/50 text-success'
                        : 'bg-surface-800/50 border-surface-600 text-surface-400 hover:border-surface-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.allowedFeature === feature.id
                          ? 'border-success bg-success'
                          : 'border-surface-500'
                      }`}>
                        {formData.allowedFeature === feature.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-medium">{feature.label}</span>
                    </div>
                    <div className="text-xs opacity-70 ml-6">{feature.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                허용 모델 ({AVAILABLE_FEATURES.find(f => f.id === formData.allowedFeature)?.label})
              </label>
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <button
                    key={model}
                    onClick={() => toggleModel(model)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                      formData.allowedModels.includes(model)
                        ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
                        : 'bg-surface-800/50 border-surface-600 text-surface-400 hover:border-surface-500'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={closeCreateModal}
              >
                취소
              </Button>
              <Button 
                className="flex-1"
                onClick={handleCreate}
                disabled={createMutation.isPending || (isAdmin && !formData.teamId)}
              >
                {createMutation.isPending ? '발급 중...' : '발급'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reveal Key Modal (일반 사용자가 승인된 요청으로 키 확인) */}
      <Modal
        isOpen={modalOpen.revealKey}
        onClose={() => {
          closeModal('revealKey');
          setRevealedApiKey(null);
          setShowKey(false);
        }}
        title="API 키 확인"
      >
        {revealedApiKey && (
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">1회성 조회입니다</span>
              </div>
              <p className="text-sm text-surface-300">
                이 키 값은 다시 확인할 수 없습니다. 반드시 안전한 곳에 저장하세요.
              </p>
            </div>
            
            <div className="relative">
              <div className="code-block pr-20">
                <code className="text-sm break-all">
                  {showKey ? revealedApiKey : '•'.repeat(40)}
                </code>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(revealedApiKey)}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => {
                closeModal('revealKey');
                setRevealedApiKey(null);
                setShowKey(false);
              }}
            >
              완료
            </Button>
          </div>
        )}
      </Modal>

      {/* Create Issue Request Modal (일반 사용자 키 발급 신청) */}
      <Modal
        isOpen={modalOpen.createIssueRequest}
        onClose={() => {
          closeModal('createIssueRequest');
          setIssueRequestFormData({
            monthlyLimitUsd: '100',
            allowedModels: DEFAULT_MODELS_BY_FEATURE['chat'],
            allowedFeature: 'chat',
          });
        }}
        title="API 키 발급 신청"
      >
        <div className="space-y-4">
          <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl">
            <p className="text-sm text-surface-300">
              관리자 승인 후 키가 발급됩니다. 승인 시 1회 열람할 수 있으며, 이후에는 키 조회 요청을 통해 열람 가능합니다.
            </p>
          </div>

          <div className="p-4 bg-surface-800/50 border border-surface-600 rounded-xl">
            <label className="block text-sm font-medium text-surface-400 mb-1">
              발급 대상 팀
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              <span className="text-white font-medium">{userTeamName}</span>
            </div>
          </div>

          <Input
            label="희망 월 사용 한도 (USD)"
            type="number"
            placeholder="예: 100"
            value={issueRequestFormData.monthlyLimitUsd}
            onChange={(e) => setIssueRequestFormData({ ...issueRequestFormData, monthlyLimitUsd: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              사용 기능 (1개 선택)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => selectIssueRequestFeature(feature.id)}
                  className={`px-3 py-2 text-left text-sm rounded-lg border transition-all ${
                    issueRequestFormData.allowedFeature === feature.id
                      ? 'bg-success/10 border-success/50 text-success'
                      : 'bg-surface-800/50 border-surface-600 text-surface-400 hover:border-surface-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      issueRequestFormData.allowedFeature === feature.id
                        ? 'border-success bg-success'
                        : 'border-surface-500'
                    }`}>
                      {issueRequestFormData.allowedFeature === feature.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium">{feature.label}</span>
                  </div>
                  <div className="text-xs opacity-70 ml-6">{feature.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              희망 모델 ({AVAILABLE_FEATURES.find(f => f.id === issueRequestFormData.allowedFeature)?.label})
            </label>
            <div className="flex flex-wrap gap-2">
              {availableIssueRequestModels.map((model) => (
                <button
                  key={model}
                  onClick={() => toggleIssueRequestModel(model)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    issueRequestFormData.allowedModels.includes(model)
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
                      : 'bg-surface-800/50 border-surface-600 text-surface-400 hover:border-surface-500'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
            <p className="text-xs text-surface-500 mt-2">
              * 관리자가 승인 시 모델 및 한도를 조정할 수 있습니다.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => {
                closeModal('createIssueRequest');
                setIssueRequestFormData({
                  monthlyLimitUsd: '100',
                  allowedModels: DEFAULT_MODELS_BY_FEATURE['chat'],
                  allowedFeature: 'chat',
                });
              }}
            >
              취소
            </Button>
            <Button 
              className="flex-1"
              onClick={handleCreateIssueRequest}
              disabled={createIssueRequestMutation.isPending || !userTeamId || issueRequestFormData.allowedModels.length === 0}
            >
              {createIssueRequestMutation.isPending ? '신청 중...' : '신청'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

