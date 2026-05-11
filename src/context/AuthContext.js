// This file is the main system for authentication. Instead of every screen managing 
// its own login state, this file holds it all in one place and shares it everywhere. 
// Its like a bulletin board that any screen can read from or write to.

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

// Creates the empty bulletin board
const AuthContext = createContext(null);

// Three pieces of tracked state
// user is the object holding email, uid, etc.
// userProfile holds the details of the object, like challenges, settings, etc.
// loading is marked true if someone is logged in, checked before screen changes
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect says run this code after the component loads, [] at the end means only run it once
  useEffect(() => {
    // Whenever someone logs in or out, run this callback function and tell me who it is
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // firebaseUser is null is nobody is logged in, this part runs every time
      setUser(firebaseUser);
      // If there is a logged-in user, get their full profile from Firestore using their uid
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser.uid);
      } else {
        // clear the profile
        setUserProfile(null);
      }
      // stop showing the loading state and render screens
      setLoading(false);
    });
    // React rule: if your useEffect returns a function, React calls that function automatically when the component is done. It's React's built-in cleanup system to cancel the listener.
    return unsubscribe;
  }, []);

  async function fetchUserProfile(uid) {
    try {
      // docRef is the location in the users folder in the database with the matching uid
      const docRef = doc(db, 'users', uid);
      // docSnap is a snap shot of the document (meta data, not the raw data - confirms existence)
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // unwraps data into JavaScript object, includes name, email, badges, challenges, etc.
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  // name, email, and password are passed from LoginScreen.js when user clicked sign up button
  async function signup(name, email, password) {
    // createUserWithEmailAndPassword is the Firebase function creating account in Firebase.
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // attaches info to Auth account
    await updateProfile(credential.user, { displayName: name });
    const newProfile = {
      uid: credential.user.uid,
      displayName: name,
      email: email,
      photoURL: null,
      joinedChallenges: [],
      completedChallenges: [],
      badges: [],
      connections: [],
      checkIns: {},
      createdAt: new Date().toISOString(),
      // default setting, other can reply to user's messages
      allowReplies: true,
      // default setting, others can see user is online
      showOnline: true,
    };
    // writes above info to the database
    await setDoc(doc(db, 'users', credential.user.uid), newProfile);
    // saves the profile into local state
    setUserProfile(newProfile);
    // sends the credential back to the LoginScreen.js screen that made the call
    return credential;
  }

  async function login(email, password) {
    // await is in the LoginScreen.js file, where login is called in handleLogin function
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function resetPassword(email) {
    // Hands the email the user enters after clicking Forgot Password hyperlink to Firebase
    // Firebase checks if email exists. If so, generates a one-time link, emails it to the 
    // user, and handles entire reset flow. This app fires and forgets.
    return sendPasswordResetEmail(auth, email);
  }

  // updates is anything the user entered to change/update in their Profile screen.
  async function updateUserProfile(updates) {
    if (!user) return;
    // docRef is the location in the users folder in the database with the matching uid
    const docRef = doc(db, 'users', user.uid);
    // writes the changes to the document at the docRef address in Firestore db service
    await updateDoc(docRef, updates);
    if (updates.displayName) {
      // writes update to the Auth service in Firebase, name is in both locations.
      await updateProfile(user, { displayName: updates.displayName });
    }
    // updates local state using previous state as param, only changes are updated in state
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }

  // updates password when logged in user updates password in Profile screen
  async function changePassword(newPassword) {
    // updatePassword is Firebase call that changes the backend though entered in app
    return updatePassword(user, newPassword);
  }

  async function deleteAccount() {
    if (!user) return;
    // deletes Firestore db account first, then the Auth account
    // User data will persist in challenges, images uploaded, and chat messages
    await deleteDoc(doc(db, 'users', user.uid));
    await user.delete();
  }

  async function refreshUserProfile() {
    if (user) await fetchUserProfile(user.uid);
  }

  // Everything built in this file is bundled into one object named value.
  // All the tools in value are exported for any other component
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

  // !loading && children means if not loading, render children. Else, render nothing.
  // While Firebase is checking if logged in, nothing renders (blank screen) instead of 
  // wrong screen (the Login screen). Prevents flicker of wrong screen to correct screen.
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
