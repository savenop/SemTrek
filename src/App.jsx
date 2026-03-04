import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [marksState, setMarksState] = useState({});
  const [user, setUser] = useState(null);

  // Auth Listener & Firestore Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // If user logs in, fetch their saved marks from the database
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().marks) {
          setMarksState(docSnap.data().marks);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize Lenis for Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Tracker marksState={marksState} setMarksState={setMarksState} user={user} />} />
        <Route path="/dashboard" element={<Dashboard marksState={marksState} />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}