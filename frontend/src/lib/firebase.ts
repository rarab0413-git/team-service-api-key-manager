import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

// Firebase 설정 (Firebase Console 값으로 교체)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Cross-origin 토큰 공유 설정
const TOKEN_PROVIDER_CONFIG = {
  providerUrl:
    import.meta.env.VITE_TOKEN_PROVIDER_URL ||
    'http://localhost:8080/token-provider',
  mainOrigin:
    import.meta.env.VITE_MAIN_DOMAIN_ORIGIN || 'http://localhost:8080',
  timeout: 10000,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

interface TokenResponse {
  token: string | null;
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  } | null;
}

export const getTokenFromMainDomain = (): Promise<TokenResponse> => {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    const currentOrigin = window.location.origin;
    iframe.src = `${TOKEN_PROVIDER_CONFIG.providerUrl}?origin=${encodeURIComponent(currentOrigin)}`;
    iframe.style.display = 'none';

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Token request timeout'));
    }, TOKEN_PROVIDER_CONFIG.timeout);

    const handleMessage = (event: MessageEvent) => {
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

export const syncAuthFromMainDomain = async (): Promise<
  TokenResponse['user'] | null
> => {
  try {
    console.log('[Auth] Trying to sync auth from main domain...');
    const response = await getTokenFromMainDomain();

    if (response.token && response.user) {
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

export const getAuthToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }

  return localStorage.getItem('firebase_shared_token');
};

export const getSharedUser = (): TokenResponse['user'] | null => {
  const stored = localStorage.getItem('firebase_shared_user');
  return stored ? JSON.parse(stored) : null;
};

export const isAuthenticated = (): boolean => {
  return !!auth.currentUser || !!getSharedUser();
};

const ADMIN_EMAILS = ['test@test.com'];

export type UserRole = 'admin' | 'user';

export const getUserRole = (email: string | null): UserRole => {
  if (!email) return 'user';
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';
};

export const login = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
  localStorage.removeItem('firebase_shared_token');
  localStorage.removeItem('firebase_shared_user');
};

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = (): User | null => auth.currentUser;
export const getCurrentEmail = (): string | null => {
  if (auth.currentUser?.email) return auth.currentUser.email;
  return getSharedUser()?.email || null;
};
export const getUid = (): string | null => {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  return getSharedUser()?.uid || null;
};

export const isAdmin = (): boolean => {
  const email = getCurrentEmail();
  return getUserRole(email) === 'admin';
};

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

declare global {
  interface Window {
    _fb: FirebaseTestObject;
  }
}
window._fb = _fb;

export default _fb;
