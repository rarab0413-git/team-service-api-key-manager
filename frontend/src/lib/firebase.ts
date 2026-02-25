import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';

// Firebase 설정 (환경 변수에서 로드)
// 필수 환경 변수 검증
const envVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// 환경 변수 이름 매핑
const envVarNames: Record<string, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID',
  databaseURL: 'VITE_FIREBASE_DATABASE_URL',
};

// 환경 변수 누락 확인
const missingVars = Object.entries(envVars)
  .filter(([, value]) => !value)
  .map(([key]) => envVarNames[key]);

if (missingVars.length > 0) {
  console.error(
    `❌ Firebase 환경 변수가 누락되었습니다:\n${missingVars.join('\n')}\n\n` +
    `frontend/.env 파일을 생성하고 .env.sample을 참고하여 설정하세요.`
  );
}

const firebaseConfig = {
  apiKey: envVars.apiKey || '',
  authDomain: envVars.authDomain || '',
  projectId: envVars.projectId || '',
  storageBucket: envVars.storageBucket || '',
  messagingSenderId: envVars.messagingSenderId || '',
  appId: envVars.appId || '',
  measurementId: envVars.measurementId || '',
  databaseURL: envVars.databaseURL || '',
};

// Cross-origin 토큰 공유 설정
const TOKEN_PROVIDER_CONFIG = {
  providerUrl: import.meta.env.VITE_TOKEN_PROVIDER_URL || '',
  mainOrigin: import.meta.env.VITE_MAIN_DOMAIN_ORIGIN || '',

  // 토큰 요청 타임아웃 (ms)
  timeout: 10000,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ============================================
// Cross-origin 토큰 공유 기능
// ============================================

interface TokenResponse {
  token: string | null;
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  } | null;
}

/**
 * 메인 도메인에서 Firebase 토큰을 가져옵니다.
 * iframe + postMessage 방식으로 cross-origin 토큰 전달
 */
export const getTokenFromMainDomain = (): Promise<TokenResponse> => {
  return new Promise((resolve, reject) => {
    // 환경 변수가 설정되지 않은 경우 즉시 실패
    if (!TOKEN_PROVIDER_CONFIG.providerUrl || !TOKEN_PROVIDER_CONFIG.mainOrigin) {
      reject(new Error('Token provider URL or main origin not configured'));
      return;
    }

    const iframe = document.createElement('iframe');
    const currentOrigin = window.location.origin;
    iframe.src = `${TOKEN_PROVIDER_CONFIG.providerUrl}?origin=${encodeURIComponent(currentOrigin)}`;
    iframe.style.display = 'none';

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Token request timeout'));
    }, TOKEN_PROVIDER_CONFIG.timeout);

    const handleMessage = (event: MessageEvent) => {
      // 메인 도메인에서 온 메시지만 처리
      if (event.origin !== TOKEN_PROVIDER_CONFIG.mainOrigin) {
        return;
      }

      if (event.data?.type === 'FIREBASE_TOKEN') {
        cleanup();
        resolve({
          token: event.data.token,
          user: event.data.user,
        });
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      if (iframe.parentNode) {
        iframe.remove();
      }
    };

    window.addEventListener('message', handleMessage);
    document.body.appendChild(iframe);
  });
};

/**
 * 메인 도메인의 인증 상태를 이 도메인에 동기화합니다.
 * 앱 시작 시 호출하여 자동 로그인 처리
 */
export const syncAuthFromMainDomain = async (): Promise<TokenResponse['user'] | null> => {
  try {
    console.log('[Auth] Trying to sync auth from main domain...');
    const response = await getTokenFromMainDomain();
    
    if (response.token && response.user) {
      // 토큰을 받았지만, ID 토큰으로는 직접 signIn 불가
      // 대신 토큰을 localStorage에 저장하고 API 요청 시 사용
      localStorage.setItem('firebase_shared_token', response.token);
      localStorage.setItem('firebase_shared_user', JSON.stringify(response.user));
      
      console.log('[Auth] Shared auth synced:', response.user.email);
      return response.user;
    } else {
      console.log('[Auth] No auth session on main domain');
      localStorage.removeItem('firebase_shared_token');
      localStorage.removeItem('firebase_shared_user');
      return null;
    }
  } catch (error) {
    console.error('[Auth] Failed to sync from main domain:', error);
    return null;
  }
};

/**
 * API 요청용 토큰을 가져옵니다.
 * 1순위: 현재 도메인의 Firebase auth
 * 2순위: 메인 도메인에서 공유받은 토큰
 */
export const getAuthToken = async (): Promise<string | null> => {
  // 현재 도메인에 로그인된 사용자가 있으면 그 토큰 사용
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  
  // 없으면 공유받은 토큰 사용
  return localStorage.getItem('firebase_shared_token');
};

/**
 * 공유된 사용자 정보를 가져옵니다.
 */
export const getSharedUser = (): TokenResponse['user'] | null => {
  const stored = localStorage.getItem('firebase_shared_user');
  return stored ? JSON.parse(stored) : null;
};

/**
 * 현재 인증 상태 확인 (로컬 또는 공유 토큰)
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser || !!getSharedUser();
};

// 관리자 이메일 목록
const ADMIN_EMAILS = ['test@test.com'];

// 사용자 역할 타입
export type UserRole = 'admin' | 'user';

// 이메일로 역할 판단
export const getUserRole = (email: string | null): UserRole => {
  if (!email) return 'user';
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';
};

// 로그인
export const login = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// 로그아웃
export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
  // 공유 토큰도 삭제
  localStorage.removeItem('firebase_shared_token');
  localStorage.removeItem('firebase_shared_user');
};

// 인증 상태 변경 구독
export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 현재 사용자 정보 (로컬 + 공유 토큰 통합)
export const getCurrentUser = (): User | null => auth.currentUser;
export const getCurrentEmail = (): string | null => {
  if (auth.currentUser?.email) return auth.currentUser.email;
  return getSharedUser()?.email || null;
};
export const getUid = (): string | null => {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  return getSharedUser()?.uid || null;
};

// 현재 사용자가 관리자인지 확인
export const isAdmin = (): boolean => {
  const email = getCurrentEmail();
  return getUserRole(email) === 'admin';
};

// 개발자 콘솔 테스트용
interface FirebaseTestObject {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => User | null;
  syncFromMainDomain: () => Promise<TokenResponse['user'] | null>;
  getToken: () => Promise<string | null>;
  email: string | null;
  uid: string | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  sharedUser: TokenResponse['user'] | null;
}

const _fb: FirebaseTestObject = {
  login,
  logout: async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('firebase_shared_token');
    localStorage.removeItem('firebase_shared_user');
  },
  getCurrentUser,
  syncFromMainDomain: syncAuthFromMainDomain,
  getToken: getAuthToken,
  get email() {
    return getCurrentEmail();
  },
  get uid() {
    return getUid();
  },
  get role() {
    return getUserRole(getCurrentEmail());
  },
  get isAdmin() {
    return isAdmin();
  },
  get isAuthenticated() {
    return isAuthenticated();
  },
  get sharedUser() {
    return getSharedUser();
  },
};

// Window 객체에 노출 (개발자 콘솔에서 테스트용)
declare global {
  interface Window {
    _fb: FirebaseTestObject;
  }
}
window._fb = _fb;

export default _fb;
