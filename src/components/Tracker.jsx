import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { academicData } from '../data';
import Modals from './Modals';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Tracker({ marksState, setMarksState, user }) {
  const [modalState, setModalState] = useState({ type: null, subject: null });

  const openModal = (type, subject) => setModalState({ type, subject });
  const closeModals = () => setModalState({ type: null, subject: null });

  // Save to local state AND sync to Firebase Firestore if logged in
  const saveMarks = async (subjectId, newMarks) => {
    const updatedState = { ...marksState, [subjectId]: newMarks };
    setMarksState(updatedState); // Update UI immediately

    if (user) {
      try {
        // Push the new marks to the cloud
        await setDoc(doc(db, 'users', user.uid), { marks: updatedState }, { merge: true });
      } catch (error) {
        console.error("Error syncing marks to cloud:", error);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const renderCreditDot = (credits) => {
    switch(credits) {
      case 4: return <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse mr-3 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="4 Credits"></span>;
      case 3: return <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse mr-3 flex-shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.8)]" title="3 Credits"></span>;
      case 2: return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-3 flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="2 Credits"></span>;
      case 1: return <span className="w-2.5 h-2.5 rounded-full bg-gray-400 mr-3 flex-shrink-0" title="1 Credit"></span>;
      default: return null;
    }
  };

  const renderCell = (subject, key) => {
    const hasComponent = subject.weights[key] !== undefined;
    const isAttempted = marksState[subject.id] && marksState[subject.id][key] !== undefined;
    
    if (!hasComponent) return <td className="px-2 py-4 text-gray-500 text-center align-middle">-</td>;
    const maxMarks = subject.weights[key];
    
    if (isAttempted) {
      const gainedMarks = marksState[subject.id][key];
      return (
        <td className="px-2 py-4 text-center align-middle">
          <span className="bg-[#2a2a2a] border border-gray-600 text-white font-bold rounded-lg px-2.5 py-1.5 inline-block whitespace-nowrap shadow-sm">
            {gainedMarks} <span className="text-gray-400 font-normal text-xs ml-0.5">/ {maxMarks}</span>
          </span>
        </td>
      );
    }
    
    return <td className="px-2 py-4 text-center text-gray-500 align-middle">{maxMarks}</td>;
  };

  const calculateGained = (subjectId) => {
    const scored = marksState[subjectId] || {};
    return Object.values(scored).reduce((sum, val) => sum + (val || 0), 0);
  };

  return (
    <div className="p-8 text-gray-200 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* --- HEADER & NAVBAR --- */}
        <header className="mb-10 flex justify-between items-end border-b border-gray-800/50 pb-6">
          <div>
            <h1 className="text-4xl font-bold gradient-text pb-1">Academic Grade Tracker</h1>
            <p className="text-gray-500 mt-2">B.Tech CSE/CS - 2nd Semester</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Conditional Authentication UI */}
            {user ? (
              <div className="flex items-center gap-3 bg-[#141414] p-1.5 pr-4 rounded-full border border-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-700" referrerPolicy="no-referrer" />
                <span className="text-sm font-semibold text-gray-300">{user.displayName.split(' ')[0]}</span>
                <div className="h-4 w-[1px] bg-gray-700 mx-1"></div>
                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 font-medium transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 hover:border-blue-500/50 text-gray-300 text-sm font-semibold tracking-wide rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Cloud Sync / Login
              </Link>
            )}

            <Link to="/dashboard" className="px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-bold tracking-wide rounded-xl transition-all border border-blue-500/20 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              View Progress
            </Link>
          </div>
        </header>

        {/* --- THEORY SUBJECTS --- */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-400 flex items-center">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span> Theory Subjects
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[1000px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 w-[28%]">Subject Name</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA1</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA2</th>
                  <th className="px-2 py-2 w-[9%] text-center">CA3 (Att)</th>
                  <th className="px-2 py-2 w-[8%] text-center">MSE 1</th>
                  <th className="px-2 py-2 w-[8%] text-center">MSE 2</th>
                  <th className="px-2 py-2 w-[8%] text-center">ESE</th>
                  <th className="px-4 py-2 text-white w-[13%] text-center">Gained Marks</th>
                  <th className="px-2 py-2 text-center w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicData.theory.map(subject => (
                  <tr key={subject.id}>
                    <td className="px-4 py-4 font-medium truncate flex items-center h-full min-h-[72px]">
                      {renderCreditDot(subject.credits)}
                      {subject.name}
                    </td>
                    {['ca1', 'ca2', 'ca3', 'mse1', 'mse2', 'ese'].map(k => <React.Fragment key={k}>{renderCell(subject, k)}</React.Fragment>)}
                    <td className="px-4 py-4 font-bold text-white text-center">{calculateGained(subject.id)} / {subject.total}</td>
                    <ActionButtons onForm={() => openModal('form', subject)} onStats={() => openModal('stats', subject)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- BLENDED SUBJECTS --- */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-400 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span> Blended Subjects
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[1000px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 w-[28%]">Subject Name</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA1</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA2</th>
                  <th className="px-2 py-2 w-[9%] text-center">CA3 (Att)</th>
                  <th className="px-2 py-2 w-[8%] text-center">MSE 1</th>
                  <th className="px-2 py-2 w-[8%] text-center">MSE 2</th>
                  <th className="px-2 py-2 w-[8%] text-center">ESE</th>
                  <th className="px-4 py-2 text-white w-[13%] text-center">Gained Marks</th>
                  <th className="px-2 py-2 text-center w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicData.blended.map(subject => (
                  <tr key={subject.id}>
                    <td className="px-4 py-4 font-medium truncate flex items-center h-full min-h-[72px]">
                      {renderCreditDot(subject.credits)}
                      {subject.name}
                    </td>
                    {['ca1', 'ca2', 'ca3', 'mse1', 'mse2', 'ese'].map(k => <React.Fragment key={k}>{renderCell(subject, k)}</React.Fragment>)}
                    <td className="px-4 py-4 font-bold text-white text-center">{calculateGained(subject.id)} / {subject.total}</td>
                    <ActionButtons onForm={() => openModal('form', subject)} onStats={() => openModal('stats', subject)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- LAB / PRACTICAL SUBJECTS --- */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-400 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Lab / Practical Subjects
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[1000px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 w-[28%]">Subject Name</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA1</th>
                  <th className="px-2 py-2 w-[7%] text-center">CA2</th>
                  <th className="px-2 py-2 w-[9%] text-center">CA3 (Att)</th>
                  <th className="px-2 py-2 w-[16%] text-center">MSE (If any)</th>
                  <th className="px-2 py-2 w-[8%] text-center">ESE</th>
                  <th className="px-4 py-2 text-white w-[13%] text-center">Gained Marks</th>
                  <th className="px-2 py-2 text-center w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academicData.practical.map(subject => (
                  <tr key={subject.id}>
                    <td className="px-4 py-4 font-medium truncate flex items-center h-full min-h-[72px]">
                      {renderCreditDot(subject.credits)}
                      {subject.name}
                    </td>
                    {['ca1', 'ca2', 'ca3', 'mse', 'ese'].map(k => <React.Fragment key={k}>{renderCell(subject, k)}</React.Fragment>)}
                    <td className="px-4 py-4 font-bold text-white text-center">{calculateGained(subject.id)} / {subject.total}</td>
                    <ActionButtons onForm={() => openModal('form', subject)} onStats={() => openModal('stats', subject)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <Modals 
        modalState={modalState} 
        closeModals={closeModals} 
        saveMarks={saveMarks} 
        marksState={marksState} 
      />
    </div>
  );
}

// ActionButtons Component
function ActionButtons({ onForm, onStats }) {
  return (
    <td className="px-2 py-4 text-center align-middle">
      <button onClick={onForm} className="p-2 hover:bg-[#222] rounded-lg transition mr-1 shadow-sm border border-transparent hover:border-gray-700" title="Fill Marks">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      </button>
      <button onClick={onStats} className="p-2 hover:bg-[#222] rounded-lg transition shadow-sm border border-transparent hover:border-gray-700" title="View Progress">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
      </button>
    </td>
  );
}