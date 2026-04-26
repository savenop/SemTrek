import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AIBot from './components/AIBot';

function mergeMarks(actual, projected) {
  if (!projected) return actual;
  const merged = { ...actual };
  for (const subId in projected) {
    if (subId === '_cgpa') continue;
    merged[subId] = { ...projected[subId], ...(actual[subId] || {}) };
  }
  return merged;
}

export default function App() {
  const [marksState, setMarksState] = useState({});
  const [user, setUser] = useState(null);
  const [globalProjectedState, setGlobalProjectedState] = useState(null);
  const [isProjecting, setIsProjecting] = useState(false);

  const combinedMarks = isProjecting ? mergeMarks(marksState, globalProjectedState) : marksState;

  // Auth Listener & Firestore Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // If user logs in, fetch their saved marks and projections from the database
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.marks) setMarksState(data.marks);
          if (data.projectedState) setGlobalProjectedState(data.projectedState);
          if (data.isProjecting !== undefined) setIsProjecting(data.isProjecting);
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
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Tracker marksState={marksState} setMarksState={setMarksState} user={user} isProjecting={isProjecting} projectedState={globalProjectedState} />} />
          <Route path="/dashboard" element={<Dashboard marksState={combinedMarks} isProjecting={isProjecting} projectedState={globalProjectedState} />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
      <AIBot 
        marksState={marksState}
        projectedState={globalProjectedState}
        setProjectedState={setGlobalProjectedState}
        isProjecting={isProjecting}
        setIsProjecting={setIsProjecting}
      />
    </>
  );
}