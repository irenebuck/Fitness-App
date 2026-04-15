import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function fetchUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  async function signup(name, email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const newProfile = {
      uid: credential.user.uid,
      displayName: name,
      email,
      photoURL: null,
      joinedChallenges: [],
      completedChallenges: [],
      badges: [],
      connections: [],
      checkIns: {},
      createdAt: new Date().toISOString(),
      allowReplies: true,
      showOnline: true,
    };
    await setDoc(doc(db, 'users', credential.user.uid), newProfile);
    setUserProfile(newProfile);
    return credential;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function updateUserProfile(updates) {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, updates);
    if (updates.displayName) {
      await updateProfile(user, { displayName: updates.displayName });
    }
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }

  async function changePassword(newPassword) {
    return updatePassword(user, newPassword);
  }

  async function deleteAccount() {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid));
    await user.delete();
  }

  async function refreshUserProfile() {
    if (user) await fetchUserProfile(user.uid);
  }

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    changePassword,
    deleteAccount,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
