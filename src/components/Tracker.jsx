import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { academicData } from '../data';
import Modals from './Modals';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export default function Tracker({ marksState, setMarksState, user }) {
  const [modalState, setModalState] = useState({ type: null, subject: null });
  // NEW: State to handle button text after clicking
  const [aiButtonText, setAiButtonText] = useState('AI Analysis');

  const openModal = (type, subject) => setModalState({ type, subject });
  const closeModals = () => setModalState({ type: null, subject: null });

  // Save to local state AND sync to Firebase Firestore if logged in
  const saveMarks = async (subjectId, newMarks) => {
    const updatedState = { ...marksState, [subjectId]: newMarks };
    setMarksState(updatedState); // Update UI immediately

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { marks: updatedState });
      } catch (error) {
        console.warn("Document doesn't exist yet, creating a new one...");
        await setDoc(userDocRef, { marks: updatedState });
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const generateAndDownloadAnalysis = () => {
    let content = "=== STUDENT ACADEMIC PROGRESS REPORT FOR AI ANALYSIS ===\n\n";

    content += "--- 1. GRADING SYSTEM & CGPA CALCULATION RULES ---\n";
    content += "Medium of Instruction: English\n";
    content += "System: Relative grading system is adopted.\n\n";
    
    content += "Grades & Points:\n";
    content += "- A+ : 10 Grade Points\n";
    content += "- A  : 9 Grade Points\n";
    content += "- B+ : 8 Grade Points\n";
    content += "- B  : 7 Grade Points\n";
    content += "- C+ : 6 Grade Points\n";
    content += "- C  : 5 Grade Points\n";
    content += "- D  : 4 Grade Points\n";
    content += "- FF : Fail\n";
    content += "- DT : Detained\n";
    content += "- AB : Absent\n";
    content += "- AU : Audit Course\n";
    content += "- AR : Arrear Course\n";
    content += "- NC : Non Credit\n\n";
    
    content += "Calculations & Formulas:\n";
    content += "- EGP (Earned Grade Points) = Course Credits x Grade Point\n";
    content += "- SGPA = Σ (EGP) / Σ (Course Credits) for courses registered in the current term.\n";
    content += "- CGPA = Σ (EGP) / Σ (Course Credits) for all completed terms/semesters including current.\n";
    content += "- Equivalent Percentage = CGPA * 10 (e.g., a CGPA of 6.25 = 62.5%).\n";
    content += "- Credit Equivalence: Theory 1 Credit = 1 Hour, Practical 1 Credit = 2 Hours.\n";
    content += "- Note: Audit/additional learning courses are excluded from SGPA/CGPA computation.\n\n";

    content += "--- 2. CURRENT SUBJECTS & MARKS BREAKDOWN ---\n";

    let totalCompletedExams = 0;
    let totalPendingExams = 0;

    const categories = [
      { name: 'Theory', data: academicData.theory },
      { name: 'Blended', data: academicData.blended },
      { name: 'Lab / Practical', data: academicData.practical }
    ];

    categories.forEach(category => {
      content += `\n[ ${category.name} Subjects ]\n`;
      
      category.data.forEach(sub => {
        content += `\nSubject: ${sub.name}\n`;
        content += `- Credits: ${sub.credits}\n`;
        content += `- Total Max Marks: ${sub.total}\n`;
        
        let gained = 0;
        let breakdown = [];

        Object.keys(sub.weights).forEach(key => {
          const maxMark = sub.weights[key];
          const scored = marksState[sub.id]?.[key];
          
          if (scored !== undefined) {
            gained += scored;
            breakdown.push(`* ${key.toUpperCase()}: Scored ${scored} out of ${maxMark} (COMPLETED)`);
            totalCompletedExams++;
          } else {
            breakdown.push(`* ${key.toUpperCase()}: Not Yet Attempted (Max: ${maxMark})`);
            totalPendingExams++;
          }
        });

        content += `- Marks Secured So Far: ${gained} / ${sub.total}\n`;
        content += `- Component Breakdown:\n  ${breakdown.join('\n  ')}\n`;
      });
    });

    content += `\n--- 3. OVERALL EXAM COMPLETION STATUS ---\n`;
    content += `Total Individual Exams/Assessments Completed: ${totalCompletedExams}\n`;
    content += `Total Individual Exams/Assessments Pending: ${totalPendingExams}\n\n`;

    content += "=== END OF DATA ===\n\n";
    
    content += "PROMPT TO AI:\n";
    content += "Please analyze my current academic performance based on the marks gained so far. I need you to accurately predict my final grade for my subjects and estimate my potential SGPA.\n\n";
    
    content += "IMPORTANT NOTE: My university strictly uses a relative grading system. Do NOT use absolute percentage conversions.\n\n";
    
    content += "--- RELATIVE CURVE ALGORITHM & HISTORICAL DATA ---\n";
    content += "To understand how the relative curve works at my university, analyze my past results:\n";
    content += "* Maths (Standard Paper): Scored 118 / 200 (59%). Received a C+ (6 Points).\n";
    content += "* COLD (Brutal Paper): Scored 68.5 / 150 (45.6%). Received a C+ (6 Points).\n";
    content += "* Chemistry (Hard Paper): Scored 49 / 100 (49%). Received a C+ (6 Points).\n";
    content += "* PPS (Standard/Easy Paper): Scored 119 / 150 (79.3%). Received a B+ (8 Points).\n\n";
    
    content += "Based on the historical data above, you MUST apply the following logic to your prediction:\n";
    content += "1. The Anchor (Class Average): The class average is firmly anchored to a C+ (6 Grade Points).\n";
    content += "2. The Baseline Spread: Depending on exam difficulty, the C+ anchor shifts (e.g., ~45% for a brutal paper, ~60% for a standard paper).\n";
    content += "3. The Step-Up Margin: The curve is highly competitive at the top. To jump from a C+ (6 points) to a B+ (8 points), a student must score approximately 20% to 30% higher than the class average.\n\n";
    
    content += "YOUR TASK: Using my current marks provided in Section 2, please estimate the shifting class average for each paper's difficulty, apply the Step-Up Margin from my historical data, and predict my final grades and SGPA.\n";

    // Trigger Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Academic_AI_Analysis_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // NEW: Update button text temporarily to instruct the user
    setAiButtonText('Downloaded!');
    setTimeout(() => {
      setAiButtonText('AI Analysis');
    }, 4000); // Reverts back after 4 seconds
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

            {/* --- UPDATED AI ANALYSIS BUTTON WITH TOOLTIP & DYNAMIC TEXT --- */}
            <div className="relative group">
              <button 
                onClick={generateAndDownloadAnalysis} 
                className="px-5 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-sm font-bold tracking-wide rounded-xl transition-all border border-purple-500/20 flex items-center gap-2 w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 21h20" /></svg>
                {aiButtonText}
              </button>
              
              {/* Hover Tooltip Instruction */}
              <div className="absolute top-full mt-4 right-0 w-72 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-15px_rgba(124,36,178,0.3)] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50 border border-purple-200 text-left">
  
  {/* Smooth Arrow pointing up (Colors fixed to match background) */}
  <div className="absolute -top-2 right-12 w-4 h-4 bg-white border-t border-l border-purple-200 transform rotate-45 rounded-tl-sm"></div>
  
  {/* Content */}
  <div className="relative z-10">
    <h3 className="text-sm font-bold text-purple-800 flex items-center">
      <span className="bg-purple-100 text-purple-600 p-1 rounded-md">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </span>
      Download and Upload to any AI :)
    </h3>
  </div>
</div>
            </div>

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