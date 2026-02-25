import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Key, 
  BarChart3, 
  Settings, 
  ChevronRight,
  PlusCircle,
  Zap,
  LogOut,
  Shield,
  User,
  Building2,
  Book
} from 'lucide-react';
import { teamsApi, keyRequestsApi, keyIssueRequestsApi, type Team, type KeyRequest, type KeyIssueRequest } from '../../lib/api';
import { useAppStore } from '../../store/app-store';
import { useAuthStore, useUserEmail, useUserTeamName, useIsAdmin } from '../../store/auth-store';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { selectedTeamId, setSelectedTeamId, openModal } = useAppStore();
  const { logout } = useAuthStore();
  const email = useUserEmail();
  const teamName = useUserTeamName();
  const isAdmin = useIsAdmin();
  
  // 관리자만 팀 목록 조회
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
    enabled: isAdmin,
  });

  // 관리자: 대기중인 키 조회 요청 수
  const { data: keyRequests = [] } = useQuery({
    queryKey: ['keyRequests'],
    queryFn: keyRequestsApi.getAll,
    enabled: isAdmin,
    refetchInterval: 300000, // 5분마다 갱신
  });

  // 관리자: 대기중인 키 발급 신청 수
  const { data: keyIssueRequests = [] } = useQuery({
    queryKey: ['keyIssueRequests'],
    queryFn: keyIssueRequestsApi.getAll,
    enabled: isAdmin,
    refetchInterval: 300000, // 5분마다 갱신
  });

  const pendingRevealCount = keyRequests.filter(
    (r: KeyRequest) => r.status === 'pending'
  ).length;

  const pendingIssueCount = keyIssueRequests.filter(
    (r: KeyIssueRequest) => r.status === 'pending'
  ).length;

  // 전체 대기중인 요청 수 (발급 신청 + 조회 요청)
  const pendingRequestCount = pendingRevealCount + pendingIssueCount;

  // 권한에 따른 네비게이션 아이템
  const navItems = isAdmin
    ? [
        { id: 'dashboard', icon: BarChart3, label: '대시보드' },
        { id: 'teams', icon: Users, label: '팀 관리' },
        { id: 'api-keys', icon: Key, label: 'API 키 관리' },
        { id: 'settings', icon: Settings, label: '설정' },
        { id: 'manual', icon: Book, label: '사용자 매뉴얼' },
      ]
    : [
        { id: 'dashboard', icon: BarChart3, label: '대시보드' },
        { id: 'api-keys', icon: Key, label: 'API 키 발급' },
        { id: 'manual', icon: Book, label: '사용자 매뉴얼' },
      ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-64 h-screen glass border-r border-surface-700/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center animate-pulse-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">API Gateway</h1>
            <p className="text-xs text-surface-400">Key Manager</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isAdmin 
              ? 'bg-gradient-to-br from-amber-500/20 to-amber-700/20' 
              : 'bg-gradient-to-br from-brand-500/20 to-brand-700/20'
          }`}>
            {isAdmin ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : (
              <User className="w-5 h-5 text-brand-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {email}
            </p>
            <p className={`text-xs ${isAdmin ? 'text-amber-400' : 'text-surface-400'}`}>
              {isAdmin ? '관리자' : '일반 사용자'}
            </p>
          </div>
        </div>
        {/* 일반 사용자: 소속 팀 표시 */}
        {!isAdmin && teamName && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
            <Building2 className="w-4 h-4 text-brand-400" />
            <span className="text-sm text-brand-300">{teamName}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          // 설정 메뉴에 대기중인 요청 뱃지 표시
          const showBadge = item.id === 'settings' && pendingRequestCount > 0 && !isActive;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-surface-300 hover:bg-surface-800/50 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
                )}
              </div>
              <span className="font-medium">{item.label}</span>
              {showBadge && (
                <span className="ml-auto px-1.5 py-0.5 text-xs font-bold bg-danger text-white rounded-full">
                  {pendingRequestCount}
                </span>
              )}
              {isActive && !showBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* Teams Quick Select - 관리자만 */}
      {isAdmin && (
        <div className="p-4 border-t border-surface-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              팀 필터
            </span>
            <button
              onClick={() => {
                onNavigate('teams'); // 팀 관리 페이지로 이동
                openModal('createTeam'); // 모달 열기
              }}
              className="text-brand-400 hover:text-brand-300 transition-colors"
              title="새 팀 등록"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            <button
              onClick={() => setSelectedTeamId(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                selectedTeamId === null
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                  : 'text-surface-300 hover:bg-surface-800/50 hover:text-white'
              }`}
            >
              전체 팀
            </button>
            {teams.map((team: Team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedTeamId === team.id
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    : 'text-surface-300 hover:bg-surface-800/50 hover:text-white'
                }`}
              >
                {team.name}
              </button>
            ))}
            {teams.length === 0 && (
              <p className="text-surface-500 text-xs text-center py-2">
                등록된 팀이 없습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-4 border-t border-surface-700/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-surface-400 hover:bg-danger/10 hover:text-danger transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
