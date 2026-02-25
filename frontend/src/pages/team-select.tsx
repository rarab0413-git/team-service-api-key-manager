import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, Check, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { teamsApi, usersApi, type Team } from '../lib/api';
import { useAuthStore, useUserEmail } from '../store/auth-store';

export function TeamSelectPage() {
  const email = useUserEmail();
  const { refreshDbUser } = useAuthStore();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; teamId: number }) => usersApi.create(data),
    onSuccess: async () => {
      // DB 사용자 정보 새로고침
      await refreshDbUser();
    },
  });

  const handleSelectTeam = async () => {
    if (!selectedTeamId || !email) return;

    try {
      await createUserMutation.mutateAsync({
        email,
        teamId: selectedTeamId,
      });
    } catch (error) {
      console.error('Failed to register user:', error);
      alert('팀 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (isLoadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 to-surface-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">팀 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 to-surface-900 p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">팀 선택</h1>
          <p className="text-surface-400">
            API 키 관리 서비스를 이용하려면 소속 팀을 선택해주세요.
          </p>
          <p className="text-sm text-surface-500 mt-2">
            로그인: <span className="text-brand-400">{email}</span>
          </p>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-surface-400 mb-4">등록된 팀이 없습니다.</p>
            <p className="text-sm text-surface-500">
              관리자에게 팀 등록을 요청해주세요.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {teams.map((team: Team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedTeamId === team.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white mb-1">{team.name}</h3>
                      <p className="text-sm text-surface-400">
                        월 예산: ${team.monthlyBudget.toLocaleString()}
                      </p>
                    </div>
                    {selectedTeamId === team.id && (
                      <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={handleSelectTeam}
              disabled={!selectedTeamId || createUserMutation.isPending}
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                '선택한 팀으로 시작하기'
              )}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
