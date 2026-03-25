import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Server, 
  Database, 
  Shield,
  Copy,
  Check,
  Users,
  UserCog,
  Building2,
  Loader2,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Badge } from '../components/ui/badge';
import { usersApi, teamsApi, keyRequestsApi, keyIssueRequestsApi, type User, type Team, type KeyRequest, type KeyIssueRequest } from '../lib/api';
import { useAppStore } from '../store/app-store';
import { useIsAdmin, useAuthStore } from '../store/auth-store';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { modalOpen, openModal, closeModal } = useAppStore();
  const isAdmin = useIsAdmin();
  const { sharedUser, firebaseUser, dbUser } = useAuthStore();
  const adminEmail =
    dbUser?.email || firebaseUser?.email || sharedUser?.email || '';
  
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  
  // 키 발급 승인 후 키 표시용
  const [issuedApiKey, setIssuedApiKey] = useState<string | null>(null);
  const [showIssuedKey, setShowIssuedKey] = useState(false);
  const [showIssuedKeyModal, setShowIssuedKeyModal] = useState(false);

  // 사용자 목록 조회
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    enabled: isAdmin,
  });

  // 팀 목록 조회
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
    enabled: isAdmin,
  });

  // 키 조회 요청 목록 (관리자용)
  const { data: keyRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['keyRequests'],
    queryFn: keyRequestsApi.getAll,
    enabled: isAdmin,
  });

  // 키 발급 신청 목록 (관리자용)
  const { data: keyIssueRequests = [], isLoading: isLoadingIssueRequests } = useQuery({
    queryKey: ['keyIssueRequests'],
    queryFn: keyIssueRequestsApi.getAll,
    enabled: isAdmin,
  });

  // 대기중인 요청만 필터
  const pendingRequests = keyRequests.filter((r: KeyRequest) => r.status === 'pending');
  const pendingIssueRequests = keyIssueRequests.filter((r: KeyIssueRequest) => r.status === 'pending');

  // 팀 변경 mutation
  const updateTeamMutation = useMutation({
    mutationFn: ({ userId, teamId }: { userId: number; teamId: number | null }) =>
      usersApi.updateTeam(userId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal('changeUserTeam');
      setSelectedUser(null);
      setSelectedTeamId(null);
    },
  });

  // 역할 변경 mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'admin' | 'user' }) =>
      usersApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // 키 조회 요청 승인
  const approveMutation = useMutation({
    mutationFn: (requestId: number) => keyRequestsApi.approve(requestId, adminEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyRequests'] });
    },
  });

  // 키 조회 요청 거절
  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => keyRequestsApi.reject(requestId, adminEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyRequests'] });
    },
  });

  // 키 발급 신청 승인
  const approveIssueMutation = useMutation({
    mutationFn: (requestId: number) => keyIssueRequestsApi.approve(requestId, adminEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['keyIssueRequests'] });
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      // 승인 성공 시 발급된 키 모달로 표시
      if (data.apiKey) {
        setIssuedApiKey(data.apiKey);
        setShowIssuedKeyModal(true);
      }
    },
  });

  // 키 발급 신청 거절
  const rejectIssueMutation = useMutation({
    mutationFn: (requestId: number) => keyIssueRequestsApi.reject(requestId, adminEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyIssueRequests'] });
    },
  });

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleOpenChangeTeam = (user: User) => {
    setSelectedUser(user);
    setSelectedTeamId(user.teamId);
    openModal('changeUserTeam');
  };

  const handleToggleRole = (user: User) => {
    // 본인을 일반 등급으로 내릴 수 없음
    if (user.email === adminEmail && user.role === 'admin') {
      alert('본인의 관리자 권한은 변경할 수 없습니다.');
      return;
    }
    
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const actionText = newRole === 'admin' ? '관리자로 승격' : '일반 사용자로 변경';
    
    if (confirm(`${user.email}을(를) ${actionText}하시겠습니까?`)) {
      updateRoleMutation.mutate({ userId: user.id, role: newRole });
    }
  };

  const handleChangeTeam = () => {
    if (!selectedUser) return;
    updateTeamMutation.mutate({
      userId: selectedUser.id,
      teamId: selectedTeamId,
    });
  };

  const gatewayEndpoints = [
    { method: 'POST', path: '/v1/chat/completions', desc: 'Chat Completions API' },
    { method: 'POST', path: '/v1/completions', desc: 'Completions API (Legacy)' },
    { method: 'POST', path: '/v1/embeddings', desc: 'Embeddings API' },
    { method: 'GET', path: '/v1/models', desc: 'List Models' },
  ];

  const adminEndpoints = [
    { method: 'GET/POST', path: '/api/teams', desc: '팀 조회/생성' },
    { method: 'GET/POST', path: '/api/api-keys', desc: 'API 키 조회/생성' },
    { method: 'PUT', path: '/api/api-keys/:id/revoke', desc: 'API 키 폐기' },
    { method: 'GET', path: '/api/usage/team/:id', desc: '팀 사용량 조회' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">설정</h1>
        <p className="text-surface-400 mt-1">사용자 관리 및 Gateway 설정</p>
      </div>

      {/* User Management - 관리자만 */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-brand-500/10">
              <Users className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">사용자 관리</h2>
              <p className="text-sm text-surface-400">등록된 사용자 조회 및 팀 변경</p>
            </div>
          </div>

          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              등록된 사용자가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase">소속 팀</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase">역할</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase">등록일</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {users.map((user: User) => (
                    <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white">{user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.teamName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-400" />
                            <span className="text-surface-200">{user.teamName}</span>
                          </div>
                        ) : (
                          <span className="text-surface-500">미지정</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>
                          {user.role === 'admin' ? '관리자' : '일반'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-surface-400 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenChangeTeam(user)}
                          >
                            <UserCog className="w-4 h-4" />
                            팀 변경
                          </Button>
                          <Button
                            variant={user.role === 'admin' ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleRole(user)}
                            disabled={updateRoleMutation.isPending || (user.email === adminEmail && user.role === 'admin')}
                            title={user.email === adminEmail && user.role === 'admin' ? '본인의 관리자 권한은 변경할 수 없습니다' : ''}
                          >
                            <Shield className="w-4 h-4" />
                            {user.role === 'admin' ? '일반으로' : '관리자로'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Key Issue Requests - 관리자만 */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-brand-500/10">
              <Key className="w-6 h-6 text-brand-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">API 키 발급 신청</h2>
              <p className="text-sm text-surface-400">사용자의 키 발급 신청을 승인/거절합니다</p>
            </div>
            {pendingIssueRequests.length > 0 && (
              <Badge variant="warning">
                {pendingIssueRequests.length}개 대기중
              </Badge>
            )}
          </div>

          {isLoadingIssueRequests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : pendingIssueRequests.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              대기중인 발급 신청이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {pendingIssueRequests.map((request: KeyIssueRequest) => (
                <div
                  key={request.id}
                  className="p-4 bg-surface-800/50 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{request.requesterEmail}</span>
                      <Badge variant="default">{request.teamName}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => rejectIssueMutation.mutate(request.id)}
                        disabled={rejectIssueMutation.isPending || approveIssueMutation.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveIssueMutation.mutate(request.id)}
                        disabled={approveIssueMutation.isPending || rejectIssueMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4" />
                        승인
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-surface-400">기능:</span>
                      <span className="text-white ml-2">{request.allowedFeature}</span>
                    </div>
                    <div>
                      <span className="text-surface-400">월 한도:</span>
                      <span className="text-white ml-2">${request.monthlyLimitUsd}</span>
                    </div>
                    <div>
                      <span className="text-surface-400">모델:</span>
                      <span className="text-white ml-2">
                        {request.allowedModels.slice(0, 2).join(', ')}
                        {request.allowedModels.length > 2 && ` 외 ${request.allowedModels.length - 2}개`}
                      </span>
                    </div>
                    <div>
                      <span className="text-surface-400">요청일:</span>
                      <span className="text-white ml-2">{new Date(request.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Key Reveal Requests - 관리자만 */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-warning/10">
              <Key className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">API 키 조회 요청</h2>
              <p className="text-sm text-surface-400">사용자의 키 조회 요청을 승인/거절합니다</p>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="warning">
                {pendingRequests.length}개 대기중
              </Badge>
            )}
          </div>

          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              대기중인 요청이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request: KeyRequest) => (
                <div
                  key={request.id}
                  className="p-4 bg-surface-800/50 rounded-xl flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-medium">{request.requesterEmail}</span>
                      <Badge variant="default">{request.teamName}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-surface-400">
                      <span>대상 키: <code className="text-brand-300">{request.keyPrefix}...</code></span>
                      <span>요청일: {new Date(request.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      거절
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4" />
                      승인
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Gateway Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-success/10">
            <Server className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Gateway 상태</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-success">정상 작동 중</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-800/50 rounded-xl">
            <p className="text-surface-400 text-sm">Base URL</p>
            <p className="text-white font-mono text-sm mt-1">{GATEWAY_URL || 'Not configured'}</p>
          </div>
          <div className="p-4 bg-surface-800/50 rounded-xl">
            <p className="text-surface-400 text-sm">API Version</p>
            <p className="text-white font-mono text-sm mt-1">v1</p>
          </div>
          <div className="p-4 bg-surface-800/50 rounded-xl">
            <p className="text-surface-400 text-sm">OpenAI Compatible</p>
            <p className="text-success font-mono text-sm mt-1">Yes</p>
          </div>
        </div>
      </Card>

      {/* Gateway Endpoints */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-brand-500/10">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Gateway 엔드포인트</h2>
            <p className="text-sm text-surface-400">팀 API 키로 호출하는 OpenAI 호환 API</p>
          </div>
        </div>

        <div className="space-y-3">
          {gatewayEndpoints.map((endpoint, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="px-2 py-1 text-xs font-semibold bg-brand-600/20 text-brand-300 rounded">
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-white">{endpoint.path}</code>
                <span className="text-sm text-surface-400">{endpoint.desc}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(`${GATEWAY_URL}${endpoint.path}`, `gateway-${index}`)}
              >
                {copied === `gateway-${index}` ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-surface-900/50 rounded-xl">
          <p className="text-sm text-surface-300 mb-3">사용 예시:</p>
          <div className="code-block text-xs">
            <code className="text-brand-300">
              curl -X POST {GATEWAY_URL || 'https://your-gateway-domain.com'}/v1/chat/completions \<br />
              &nbsp;&nbsp;-H "Authorization: Bearer team-sk-xxxxxxxx" \<br />
              &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
              &nbsp;&nbsp;-d '&#123;"model": "gpt-4", "messages": [&#123;"role": "user", "content": "Hello"&#125;]&#125;'
            </code>
          </div>
        </div>
      </Card>

      {/* Admin API */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-warning/10">
            <Database className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">관리자 API</h2>
            <p className="text-sm text-surface-400">팀 및 API 키 관리를 위한 내부 API</p>
          </div>
        </div>

        <div className="space-y-3">
          {adminEndpoints.map((endpoint, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="px-2 py-1 text-xs font-semibold bg-warning/20 text-warning rounded">
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-white">{endpoint.path}</code>
                <span className="text-sm text-surface-400">{endpoint.desc}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(`${GATEWAY_URL}${endpoint.path}`, `admin-${index}`)}
              >
                {copied === `admin-${index}` ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Environment Setup */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-purple-500/10">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">환경 설정</h2>
            <p className="text-sm text-surface-400">Gateway 운영을 위한 환경 변수</p>
          </div>
        </div>

        <div className="code-block text-xs">
          <code className="text-surface-300">
            <span className="text-surface-500"># Database Configuration</span><br />
            DB_HOST=localhost<br />
            DB_PORT=3306<br />
            DB_USERNAME=root<br />
            DB_PASSWORD=<span className="text-warning">your_password</span><br />
            DB_DATABASE=api_key_manager<br /><br />
            <span className="text-surface-500"># OpenAI API Key (Real key - Gateway only)</span><br />
            OPENAI_API_KEY=<span className="text-danger">sk-real-prod-xxx</span><br /><br />
            <span className="text-surface-500"># Server Configuration</span><br />
            PORT=3002
          </code>
        </div>

        <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-xl">
          <p className="text-sm text-danger font-semibold mb-1">⚠️ 보안 주의사항</p>
          <p className="text-sm text-surface-300">
            OPENAI_API_KEY는 절대 외부에 노출되지 않도록 주의하세요. 
            이 키는 Gateway 서버에서만 사용되며, 팀에게는 team-sk-xxx 형태의 프록시 키만 제공됩니다.
          </p>
        </div>
      </Card>

      {/* Change User Team Modal */}
      <Modal
        isOpen={modalOpen.changeUserTeam}
        onClose={() => {
          closeModal('changeUserTeam');
          setSelectedUser(null);
          setSelectedTeamId(null);
        }}
        title="사용자 팀 변경"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-800/50 rounded-xl">
              <p className="text-sm text-surface-400 mb-1">대상 사용자</p>
              <p className="text-white font-medium">{selectedUser.email}</p>
              {selectedUser.teamName && (
                <p className="text-sm text-surface-400 mt-1">
                  현재 팀: <span className="text-brand-400">{selectedUser.teamName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                변경할 팀
              </label>
              <select
                className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-600 rounded-xl text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                value={selectedTeamId ?? ''}
                onChange={(e) => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">팀 없음 (미지정)</option>
                {teams.map((team: Team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  closeModal('changeUserTeam');
                  setSelectedUser(null);
                  setSelectedTeamId(null);
                }}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleChangeTeam}
                disabled={updateTeamMutation.isPending}
              >
                {updateTeamMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  '변경'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Issued API Key Modal (관리자 승인 시 키 표시) */}
      <Modal
        isOpen={showIssuedKeyModal}
        onClose={() => {
          setShowIssuedKeyModal(false);
          setIssuedApiKey(null);
          setShowIssuedKey(false);
        }}
        title="API 키 발급 완료"
      >
        {issuedApiKey && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
              <div className="flex items-center gap-2 text-success mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">키가 발급되었습니다</span>
              </div>
              <p className="text-sm text-surface-300">
                사용자에게 전달이 필요한 경우 아래 키를 복사하세요. 이 키는 다시 확인할 수 없습니다.
              </p>
            </div>
            
            <div className="relative">
              <div className="p-4 bg-surface-800/50 border border-surface-600 rounded-xl font-mono text-sm break-all pr-20">
                {showIssuedKey ? issuedApiKey : '•'.repeat(40)}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIssuedKey(!showIssuedKey)}
                >
                  {showIssuedKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(issuedApiKey);
                    setCopied('issuedKey');
                    setTimeout(() => setCopied(null), 2000);
                  }}
                >
                  {copied === 'issuedKey' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                <p className="text-xs text-surface-300">
                  사용자도 "키 확인 (1회)" 버튼으로 이 키를 1회 열람할 수 있습니다.
                </p>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => {
                setShowIssuedKeyModal(false);
                setIssuedApiKey(null);
                setShowIssuedKey(false);
              }}
            >
              완료
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

