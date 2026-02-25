import { create } from 'zustand';

interface AppState {
  selectedTeamId: number | null;
  sidebarOpen: boolean;
  modalOpen: {
    createTeam: boolean;
    createApiKey: boolean;
    editTeam: boolean;
    changeUserTeam: boolean;
    revealKey: boolean;
    createIssueRequest: boolean;
  };
  
  setSelectedTeamId: (id: number | null) => void;
  toggleSidebar: () => void;
  openModal: (modal: keyof AppState['modalOpen']) => void;
  closeModal: (modal: keyof AppState['modalOpen']) => void;
  closeAllModals: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTeamId: null,
  sidebarOpen: true,
  modalOpen: {
    createTeam: false,
    createApiKey: false,
    editTeam: false,
    changeUserTeam: false,
    revealKey: false,
    createIssueRequest: false,
  },

  setSelectedTeamId: (id) => set({ selectedTeamId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modal) => 
    set((state) => ({ 
      modalOpen: { ...state.modalOpen, [modal]: true } 
    })),
  closeModal: (modal) => 
    set((state) => ({ 
      modalOpen: { ...state.modalOpen, [modal]: false } 
    })),
  closeAllModals: () => 
    set({ 
      modalOpen: { 
        createTeam: false, 
        createApiKey: false, 
        editTeam: false,
        changeUserTeam: false,
        revealKey: false,
        createIssueRequest: false,
      } 
    }),
}));






