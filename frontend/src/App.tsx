import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/layout/sidebar';
import { DashboardPage } from './pages/dashboard';
import { TeamsPage } from './pages/teams';
import { ApiKeysPage } from './pages/api-keys';
import { SettingsPage } from './pages/settings';
import { ManualPage } from './pages/manual';
import { LoginPage } from './pages/login';
import { TeamSelectPage } from './pages/team-select';
import { useAuthStore, useNeedsTeamSelection, useIsAdmin } from './store/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// 로딩 화면 컴포넌트
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
        <p className="text-surface-400">인증 정보를 확인하는 중...</p>
      </div>
    </div>
  );
}

// 메인 앱 컨텐츠 (인증된 사용자)
function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const isAdmin = useIsAdmin();

  // 권한에 따른 기본 페이지 설정
  useEffect(() => {
    // 일반 사용자가 관리자 전용 페이지에 있으면 대시보드로 리다이렉트
    if (!isAdmin && (currentPage === 'teams' || currentPage === 'settings')) {
      setCurrentPage('dashboard');
    }
  }, [isAdmin, currentPage]);

  const renderPage = () => {
    // 매뉴얼 페이지는 모든 사용자 접근 가능
    if (currentPage === 'manual') {
      return <ManualPage />;
    }

    // 관리자 전용 페이지 접근 제어
    if (!isAdmin) {
      switch (currentPage) {
        case 'dashboard':
          return <DashboardPage />;
        case 'api-keys':
          return <ApiKeysPage />;
        default:
          return <DashboardPage />;
      }
    }

    // 관리자 - 모든 페이지 접근 가능
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'teams':
        return <TeamsPage />;
      case 'api-keys':
        return <ApiKeysPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated, initialize } = useAuthStore();
  const needsTeamSelection = useNeedsTeamSelection();
  const isAdmin = useIsAdmin();

  // Firebase 인증 상태 구독
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  // 로딩 중
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 미인증 - 로그인 페이지
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 인증됨 + 팀 선택 필요 (일반 사용자만)
  // 관리자는 팀 선택 불필요
  if (needsTeamSelection && !isAdmin) {
    return <TeamSelectPage />;
  }

  // 인증됨 + 팀 설정 완료 - 메인 앱
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
