import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { UserProfile } from '../types/user';

export const authService = {
  /**
   * Registers a new breeder and initializes their user profile in Firestore
   */
  async register(email: string, password: string, name: string): Promise<UserProfile> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create UserProfile structure
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      name,
      email,
      // Fallback local timestamp for UI, though we write to db
      createdAt: Timestamp.now(),
    };
    
    // Save to Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: profile.uid,
      name: profile.name,
      email: profile.email,
      createdAt: serverTimestamp(), // Firestore resolves this to Timestamp on server side
    });
    
    return profile;
  },

  /**
   * Log in user with email and password
   */
  async login(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  /**
   * Log out current user
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  /**
   * Automatically ensures a user profile document exists in Firestore and loads it.
   */
  async createProfileIfMissing(uid: string, email: string, displayName?: string | null): Promise<UserProfile> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }

    const fallbackName = displayName || email.split('@')[0] || 'Breeder';
    const profile: UserProfile = {
      uid,
      name: fallbackName,
      email,
      createdAt: Timestamp.now()
    };

    await setDoc(docRef, {
      uid: profile.uid,
      name: profile.name,
      email: profile.email,
      createdAt: serverTimestamp()
    });

    const updatedSnap = await getDoc(docRef);
    if (updatedSnap.exists()) {
      return updatedSnap.data() as UserProfile;
    }
    return profile;
  },

  /**
   * Update breeder's profile name
   */
  async updateProfileName(uid: string, name: string): Promise<void> {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { name: name.trim() });
  }
};
