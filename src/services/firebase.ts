import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

export type { User };

const firebaseConfig = {
  apiKey: 'AIzaSyA9wln0VT7nyj1ECTObThnzkpXwPma-ZVg',
  authDomain: 'nifty-garden-474509-b4.firebaseapp.com',
  projectId: 'nifty-garden-474509-b4',
  storageBucket: 'nifty-garden-474509-b4.firebasestorage.app',
  messagingSenderId: '594749896867',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Check for redirect result on page load
getRedirectResult(auth).then((result) => {
  if (result?.user) {
    console.log('Sign-in redirect successful:', result.user.email);
  }
}).catch((error) => {
  console.error('Redirect result error:', error);
});

export async function signInWithGoogle(): Promise<User> {
  // Use redirect-based auth for Cloud Run deployment (more reliable than popup)
  // Popup often fails on custom domains due to cross-origin restrictions
  console.log('Starting redirect sign-in...');
  await signInWithRedirect(auth, googleProvider);
  // This won't return - page will redirect to Google
  throw new Error('Redirecting to sign-in...');
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
