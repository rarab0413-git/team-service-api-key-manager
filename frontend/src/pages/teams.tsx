import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Badge } from '../components/ui/badge';
import { teamsApi, type Team } from '../lib/api';
import { useAppStore } from '../store/app-store';

export function TeamsPage() {
  const queryClient = useQueryClient();
  const { modalOpen, openModal, closeModal } = useAppStore();
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', monthlyBudget: '' });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; monthlyBudget: number }) => teamsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeModal('createTeam');
      setFormData({ name: '', monthlyBudget: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; monthlyBudget?: number } }) => 
      teamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      closeModal('editTeam');
      setEditingTeam(null);
      setFormData({ name: '', monthlyBudget: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.monthlyBudget) return;
    createMutation.mutate({
      name: formData.name,
      monthlyBudget: parseFloat(formData.monthlyBudget),
    });
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({ 
      name: team.name, 
      monthlyBudget: team.monthlyBudget.toString() 
    });
    openModal('editTeam');
  };

  const handleUpdate = () => {
    if (!editingTeam) return;
    updateMutation.mutate({
      id: editingTeam.id,
      data: {
        name: formData.name,
        monthlyBudget: parseFloat(formData.monthlyBudget),
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('정말 이 팀을 삭제하시겠습니까? 연결된 API 키도 함께 삭제됩니다.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">팀 관리</h1>
          <p className="text-surface-400 mt-1">API 키를 발급받을 팀을 관리합니다</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', monthlyBudget: '' });
          openModal('createTeam');
        }}>
          <Plus className="w-4 h-4" />
          새 팀 등록
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team: Team, index: number) => (
          <Card 
            key={team.id} 
            variant="interactive"
            className="p-6"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{team.name}</h3>
                  <Badge variant="success">활성</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-surface-300">
                <DollarSign className="w-4 h-4 text-surface-500" />
                <span className="text-sm">월 예산:</span>
                <span className="font-semibold text-white">${team.monthlyBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-surface-300">
                <Calendar className="w-4 h-4 text-surface-500" />
                <span className="text-sm">등록일:</span>
                <span className="text-white">{new Date(team.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-surface-700/50">
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1"
                onClick={() => handleEdit(team)}
              >
                <Pencil className="w-4 h-4" />
                수정
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                className="flex-1"
                onClick={() => handleDelete(team.id)}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </div>
          </Card>
        ))}

        {isLoading && (
          <div className="col-span-full text-center py-12 text-surface-400">
            로딩 중...
          </div>
        )}

        {!isLoading && teams.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">등록된 팀이 없습니다</p>
            <Button 
              className="mt-4"
              onClick={() => openModal('createTeam')}
            >
              <Plus className="w-4 h-4" />
              첫 번째 팀 등록하기
            </Button>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={modalOpen.createTeam}
        onClose={() => closeModal('createTeam')}
        title="새 팀 등록"
      >
        <div className="space-y-4">
          <Input
            label="팀 이름"
            placeholder="예: Engineering"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="월간 예산 (USD)"
            type="number"
            placeholder="예: 500"
            value={formData.monthlyBudget}
            onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => closeModal('createTeam')}
            >
              취소
            </Button>
            <Button 
              className="flex-1"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={modalOpen.editTeam}
        onClose={() => {
          closeModal('editTeam');
          setEditingTeam(null);
        }}
        title="팀 정보 수정"
      >
        <div className="space-y-4">
          <Input
            label="팀 이름"
            placeholder="예: Engineering"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="월간 예산 (USD)"
            type="number"
            placeholder="예: 500"
            value={formData.monthlyBudget}
            onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => {
                closeModal('editTeam');
                setEditingTeam(null);
              }}
            >
              취소
            </Button>
            <Button 
              className="flex-1"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '수정 중...' : '수정'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

