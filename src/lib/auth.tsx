"use client";

import {
  type User as FirebaseUser,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  accessDenied: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAccessDenied(false);
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const newProfile = {
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName ?? firebaseUser.email ?? "",
            isAdmin: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          const created = await getDoc(userRef);
          setProfile(created.data() as UserProfile);
        }
      } catch (err) {
        console.error("user profile provisioning failed", err);
        setAccessDenied(true);
        setProfile(null);
        await firebaseSignOut(auth);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    setAccessDenied(false);
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    user,
    profile,
    isAdmin: profile?.isAdmin ?? false,
    loading,
    accessDenied,
    signIn,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
