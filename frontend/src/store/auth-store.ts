import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { 
  subscribeToAuthState, 
  syncAuthFromMainDomain,
  logout as firebaseLogout,
} from '../lib/firebase';
import { usersApi, type User as DbUser } from '../lib/api';

interface SharedUser {
  uid: string;
  email: string;
  displayName: string | null;
}

export type UserRole = 'admin' | 'user';

interface AuthState {
  // Firebase 인증 정보
  firebaseUser: User | null;
  sharedUser: SharedUser | null;
  
  // DB 사용자 정보
  dbUser: DbUser | null;
  
  // 상태
  role: UserRole;
  teamId: number | null;
  teamName: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsTeamSelection: boolean;  // 팀 선택 필요 여부
  
  // Actions
  setDbUser: (dbUser: DbUser | null) => void;
  setNeedsTeamSelection: (needs: boolean) => void;
  initialize: () => () => void;
  refreshDbUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  sharedUser: null,
  dbUser: null,
  role: 'user',
  teamId: null,
  teamName: null,
  isLoading: true,
  isAuthenticated: false,
  needsTeamSelection: false,

  setDbUser: (dbUser) => set({
    dbUser,
    role: dbUser?.role || 'user',
    teamId: dbUser?.teamId || null,
    teamName: dbUser?.teamName || null,
    needsTeamSelection: !dbUser || dbUser.teamId === null,
  }),

  setNeedsTeamSelection: (needs) => set({ needsTeamSelection: needs }),

  refreshDbUser: async () => {
    const email = get().firebaseUser?.email || get().sharedUser?.email;
    if (!email) return;

    try {
      const dbUser = await usersApi.getByEmail(email);
      set({
        dbUser,
        role: dbUser?.role || 'user',
        teamId: dbUser?.teamId || null,
        teamName: dbUser?.teamName || null,
        needsTeamSelection: !dbUser || dbUser.teamId === null,
      });
    } catch (error) {
      console.error('[Auth] Failed to refresh DB user:', error);
    }
  },

  logout: async () => {
    try {
      // Firebase 로그아웃 + localStorage 삭제
      await firebaseLogout();
      
      // Store 상태 초기화
      set({
        firebaseUser: null,
        sharedUser: null,
        dbUser: null,
        role: 'user',
        teamId: null,
        teamName: null,
        isAuthenticated: false,
        needsTeamSelection: false,
        isLoading: false,
      });
      
      console.log('[Auth] Logged out successfully');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  },

  initialize: () => {
    // Firebase 인증 상태 변경 구독
    const unsubscribe = subscribeToAuthState(async (user) => {
      let email: string | null = null;

      if (user) {
        // 로컬 Firebase 인증 있음
        email = user.email;
        set({
          firebaseUser: user,
          sharedUser: null,
          isAuthenticated: true,
        });
      } else {
        // 로컬 인증 없음 → 메인 도메인에서 토큰 가져오기 시도
        console.log('[Auth] No local auth, trying to sync from main domain...');
        const sharedUser = await syncAuthFromMainDomain();
        
        if (sharedUser) {
          email = sharedUser.email;
          set({
            firebaseUser: null,
            sharedUser,
            isAuthenticated: true,
          });
        } else {
          set({
            firebaseUser: null,
            sharedUser: null,
            dbUser: null,
            role: 'user',
            teamId: null,
            teamName: null,
            isAuthenticated: false,
            needsTeamSelection: false,
            isLoading: false,
          });
          return;
        }
      }

      // DB에서 사용자 정보 조회
      if (email) {
        try {
          console.log('[Auth] Fetching DB user for:', email);
          const dbUser = await usersApi.getByEmail(email);
          
          if (dbUser) {
            console.log('[Auth] DB user found:', dbUser);
            set({
              dbUser,
              role: dbUser.role,
              teamId: dbUser.teamId,
              teamName: dbUser.teamName,
              needsTeamSelection: dbUser.teamId === null,
              isLoading: false,
            });
          } else {
            console.log('[Auth] DB user not found, needs team selection');
            set({
              dbUser: null,
              role: 'user',
              teamId: null,
              teamName: null,
              needsTeamSelection: true,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('[Auth] Failed to fetch DB user:', error);
          set({
            dbUser: null,
            role: 'user',
            teamId: null,
            teamName: null,
            needsTeamSelection: true,
            isLoading: false,
          });
        }
      }
    });
    
    return unsubscribe;
  },
}));

// 권한 체크 헬퍼 함수
export const useIsAdmin = () => useAuthStore((state) => state.role === 'admin');
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useUserEmail = () => useAuthStore((state) => 
  state.firebaseUser?.email || state.sharedUser?.email || null
);
export const useUserTeamId = () => useAuthStore((state) => state.teamId);
export const useUserTeamName = () => useAuthStore((state) => state.teamName);
export const useNeedsTeamSelection = () => useAuthStore((state) => state.needsTeamSelection);
export const useDbUser = () => useAuthStore((state) => state.dbUser);
