import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const env = (import.meta as any).env || {};
const config = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || (firebaseConfig as any).measurementId || '',
};

const app = getApps().length > 0 ? getApp() : initializeApp(config);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/contacts');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'select_account' });

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = getAccessToken();
      if (onAuthSuccess) onAuthSuccess(user, activeToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;

    if (accessToken) {
      cachedAccessToken = accessToken;
      // Save token in localStorage with timestamp for expiration handling
      try {
        localStorage.setItem(
          'google_tokens',
          JSON.stringify({
            access_token: accessToken,
            created_at: Date.now()
          })
        );
      } catch (e) {
        console.warn('Unable to store tokens in localStorage', e);
      }
    }

    return { user: result.user, accessToken: accessToken || '' };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user') || error?.code === 'auth/cancelled-popup-request') {
      console.info('Pop-up de login foi fechado pelo usuário.');
      return null;
    }
    console.error('Firebase login error:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem('google_tokens');
    if (stored) {
      let parsed: any;
      try {
        parsed = typeof stored === 'string' && stored.startsWith('{') ? JSON.parse(stored) : stored;
      } catch (e) {
        parsed = stored;
      }

      const token = typeof parsed === 'object' && parsed !== null
        ? (parsed.access_token || parsed.accessToken || null)
        : (typeof parsed === 'string' ? parsed : null);

      if (parsed && typeof parsed === 'object' && parsed.created_at) {
        if (Date.now() - parsed.created_at > 55 * 60 * 1000) {
          console.warn('Google Access Token expirado (mais de 55 minutos)');
          cachedAccessToken = null;
          localStorage.removeItem('google_tokens');
          return null;
        }
      }

      if (token) {
        cachedAccessToken = token;
        return token;
      }
    }
  } catch (e) {}
  return null;
};

export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Error signing out of Firebase:', e);
  }
  cachedAccessToken = null;
  try {
    localStorage.removeItem('google_tokens');
  } catch (e) {}
};
