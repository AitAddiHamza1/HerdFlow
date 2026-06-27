/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { authService } from '../services/authService';
import type { UserProfile } from '../types/user';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userProfile = await authService.createProfileIfMissing(
            currentUser.uid,
            currentUser.email || '',
            currentUser.displayName
          );
          setProfile(userProfile);
        } catch (error) {
          console.error("Failed to load user profile:", error);
          // Set basic profile if Firestore load fails momentarily
          setProfile({
            uid: currentUser.uid,
            name: currentUser.displayName || 'Breeder',
            email: currentUser.email || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const updateProfileName = async (name: string) => {
    if (!user) return;
    await authService.updateProfileName(user.uid, name);
    const updatedProfile = await authService.getUserProfile(user.uid);
    setProfile(updatedProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
