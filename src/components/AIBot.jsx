import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { academicData } from '../data';
import { auth, db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

export default function AIBot({ marksState, projectedState, setProjectedState, isProjecting, setIsProjecting }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [phase, setPhase] = useState('idle');
  const [aiQuestions, setAiQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState(null);

  const loadingMessages = ['Accumulating data...', 'Analyzing...', 'Thinking...', 'Predicting...', 'Almost there...'];
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (phase === 'generating_questions' || phase === 'projecting') {
      interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const getGeminiInstance = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Please set VITE_GEMINI_API_KEY in your .env file');
    return new GoogleGenAI({ apiKey });
  };

  const buildContextString = () => {
    let contextStr = "Academic Structure & Current Marks:\n\n";
    const subjects = [...academicData.theory, ...academicData.blended, ...academicData.practical];
    
    subjects.forEach(sub => {
      contextStr += `Subject: ${sub.name} (ID: ${sub.id})\n`;
      contextStr += `Mapping: ${JSON.stringify(sub.weights)}\n`;
      const scored = marksState[sub.id] || {};
      contextStr += `Scored: ${JSON.stringify(scored)}\n\n`;
    });
    return contextStr;
  };

  const generateQuestions = async () => {
    setPhase('generating_questions');
    setError(null);
    try {
      const ai = getGeminiInstance();
      const prompt = `
        You are an intelligent academic analyzer. We want to predict a student's missing grades.
        
        ${buildContextString()}
        
        TASK:
        Generate exactly 4 to 6 short questions to ask the student so we can better predict their remaining marks.
        - DO NOT use percentages in your questions or suggestions. Use actual marks or relative terms.
        - Mix it up: Sometimes ask general relative questions (e.g., "Will your ESE be better or worse than your MSEs?").
        - Sometimes ask subject-specific range questions but these type should be less (e.g., "For Linear Algebra, what is your expected ESE score?").
        - For range questions, explicitly ask the user to provide their worst and best case marks.
        - Provide 3 to 4 short suggested replies. For range suggestions, format them like "40-50" or "60-70" or "Custum".
        - Keep questions short (under 20 words).
        - CA's Are not very important u dont need to ask very brief questions about them as almost everyone scores full in them.
        
        OUTPUT:
        Return ONLY a raw JSON array of objects exactly matching this format:
        [
          { 
            "question": "Question text...", 
            "formatHint": "Optional hint to highlight, e.g. 'Format: worst-best', else null",
            "suggestions": ["x", "y", "z"] 
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) throw new Error("Empty response from AI.");

      const sanitized = generatedText.replace(/```json\n?|\n?```/g, '');
      const questionsArray = JSON.parse(sanitized);
      
      setAiQuestions(questionsArray);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setPhase('answering');
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate questions. Check API key.");
      setPhase('idle');
    }
  };

  const projectFinalMarks = async () => {
    setPhase('projecting');
    setError(null);
    try {
      const ai = getGeminiInstance();
      
      let qaContext = "Here is the contextual interview from the student about their exams:\n";
      aiQuestions.forEach((qObj, i) => {
        qaContext += `Q: ${qObj.question}\nA: ${userAnswers[i] || "No comment."}\n\n`;
      });

      const prompt = `
        You are an intelligent academic analyzer predicting the missing marks for a student.
        
        ${buildContextString()}
        
        ${qaContext}
        
        === GRADING SYSTEM & RELATIVE CURVE ALGORITHM ===
        Medium of Instruction: English
        System: Relative grading system is adopted.

        Grades & Points:
        A+ : 10, A: 9, B+: 8, B: 7, C+: 6, C: 5, D: 4, FF: Fail

        Calculations:
        - SGPA = Σ (EGP) / Σ (Course Credits)
        - Note: Audit/additional learning courses are excluded.

        Historical Data & Curve Logic:
        * Maths: Scored 118/200 (59%). Received a C+ (6 Points).
        * COLD: Scored 68.5/150 (45.6%). Received a C+ (6 Points).
        * Chemistry: Scored 49/100 (49%). Received a C+ (6 Points).
        * PPS: Scored 119/150 (79.3%). Received a B+ (8 Points).

        Logic to apply:
        1. The Anchor: The class average is firmly anchored to a C+ (6 Grade Points).
        2. The Baseline Spread: Depending on exam difficulty, the C+ anchor shifts (e.g., ~45% for a brutal paper, ~60% for a standard paper).
        3. The Step-Up Margin: To jump from a C+ (6 points) to a B+ (8 points), you must score approx 20% to 30% higher than the class average.
        
        IMPORTANT INSTRUCTIONS:
        1. Predict missing scores for ANY component defined in 'Mapping' but MISSING from 'Scored'. Use the contextual interview heavily.
        2. Give whole or precisely realistic half-decimals (e.g. 7.5 or 8). NEVER exceed the Max Mark.
        3. Using the Relative Curve Algorithm, estimate the final expected Grade and Grade Point (e.g., 8 for B+) for EVERY subject based on the total predicted marks (Scored + Predicted).
        4. Output MUST EXCLUSIVELY be a valid JSON object strictly matching this format:
           {
             "projected_marks": {
               "sub_id_1": { "missing_comp_1": score },
               ...
             },
             "grades": {
               "sub_id_1": {
                 "point": 8,
                 "grade": "B+"
               },
               ...
             },
             "explanation": "Small explanation of how we calculated the data which is that, we used prev sem data and their corresponding grades.. amke an algorithm which tells teh predive grade for your marks in your colege.. and on the basis of grades we calculated cgpa."
           }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) throw new Error("Empty response from AI.");

      const sanitized = generatedText.replace(/```json\n?|\n?```/g, '');
      const data = JSON.parse(sanitized);

      const newState = { ...data.projected_marks, _grades: data.grades, _explanation: data.explanation };
      setProjectedState(newState);
      setIsProjecting(true);
      setPhase('idle');
      setIsOpen(false);

      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        try {
          await updateDoc(userDocRef, { projectedState: newState, isProjecting: true });
        } catch(e) {
          await setDoc(userDocRef, { projectedState: newState, isProjecting: true }, { merge: true });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to project marks.");
      setPhase(aiQuestions.length > 0 ? 'answering' : 'idle');
    }
  };

  const toggleLayer = async () => {
    const newState = !isProjecting;
    setIsProjecting(newState);
    setIsOpen(false);

    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await updateDoc(userDocRef, { isProjecting: newState });
      } catch(e) {
        await setDoc(userDocRef, { isProjecting: newState }, { merge: true });
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] border border-black flex items-center justify-center text-gray-200 hover:text-white transition-all z-50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_10px_rgba(0,0,0,0.8)] active:scale-[0.95] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0px_0px_rgba(0,0,0,0)] group"
      >
        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, width: phase === 'answering' ? 512 : 320 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 bg-[#121212] backdrop-blur-2xl border border-gray-700/50 rounded-3xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] z-50 max-h-[80vh] flex flex-col"
          >
             <div className="absolute inset-0 z-0 rounded-3xl bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a] pointer-events-none"></div>
             <div className="absolute inset-0 z-0 rounded-3xl pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

             <div className="flex flex-shrink-0 items-center justify-between mb-4 relative z-10">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                   <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                   Predict Marks
                </h3>
                
                {projectedState && Object.keys(projectedState).length > 0 && phase === 'idle' && (
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Layer</span>
                     <button
                        onClick={toggleLayer}
                        className={`w-14 h-7 rounded-full relative transition-all duration-300 border border-[#111] shadow-[inset_0_3px_6px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.05)] ${isProjecting ? 'bg-gradient-to-b from-[#222] to-[#111]' : 'bg-gradient-to-b from-[#111] to-[#050505]'}`}
                     >
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 bg-gradient-to-b from-[#555] to-[#2a2a2a] border border-[#666] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.8)] absolute top-[3px] ${isProjecting ? 'right-[3px]' : 'left-[3px]'}`}
                        />
                     </button>
                  </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar relative z-10">
                              {phase === 'answering' && aiQuestions.length > 0 ? (
                 <div className="flex flex-col gap-5 relative z-10">
                    <div className="flex flex-col items-center mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        {aiQuestions.map((_, idx) => (
                           <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentQuestionIndex ? 'w-6 bg-purple-500' : idx < currentQuestionIndex ? 'w-2 bg-purple-500/50' : 'w-2 bg-gray-700'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Context Gathering</p>
                    </div>

                    <div className="bg-[#161616]/80 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl">
                       <label className="block text-base font-bold text-gray-100 mb-6 leading-relaxed text-center">
                         {aiQuestions[currentQuestionIndex]?.question}
                         {aiQuestions[currentQuestionIndex]?.formatHint && (
                           <span className="block mt-2 text-sm text-purple-400/90 font-medium">
                             {aiQuestions[currentQuestionIndex].formatHint}
                           </span>
                         )}
                       </label>
                       
                       {aiQuestions[currentQuestionIndex]?.suggestions?.length > 0 && (
                         <div className="flex flex-wrap gap-2 mb-5 justify-center">
                           {aiQuestions[currentQuestionIndex].suggestions.map((sug, idx) => (
                             <button
                               key={idx}
                               onClick={() => setUserAnswers({...userAnswers, [currentQuestionIndex]: sug})}
                               className={`px-4 py-2 border rounded-full text-sm font-medium transition-all duration-200 ${userAnswers[currentQuestionIndex] === sug ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 hover:border-gray-600'}`}
                             >
                               {sug}
                             </button>
                           ))}
                         </div>
                       )}

                       <div className="relative">
                         <textarea 
                           rows="2"
                           placeholder="Or type a custom answer..."
                           value={userAnswers[currentQuestionIndex] || ''}
                           onChange={(e) => setUserAnswers({...userAnswers, [currentQuestionIndex]: e.target.value})}
                           className="w-full bg-[#0a0a0a] text-sm text-gray-200 rounded-xl border border-gray-800 px-4 py-3 outline-none focus:border-purple-500/50 transition-colors resize-none placeholder-gray-600"
                         />
                       </div>
                    </div>
                    
                    <div className="flex gap-3 mt-1">
                      <button 
                         onClick={() => setPhase('idle')} 
                         className="px-4 py-3 rounded-xl bg-[#1a1a1a] hover:bg-gray-800 text-gray-400 font-medium text-sm transition-all border border-transparent hover:border-gray-700"
                      >
                         Cancel
                      </button>

                      {currentQuestionIndex < aiQuestions.length - 1 ? (
                        <button 
                          onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                          className="flex-1 relative overflow-hidden group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 hover:bg-white text-gray-900 font-bold text-sm transition-all shadow-lg active:scale-95"
                        >
                          Next
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                      ) : (
                        <button 
                          onClick={projectFinalMarks}
                          disabled={phase === 'projecting'}
                          className="flex-1 relative overflow-hidden group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 active:scale-95"
                        >
                          {phase === 'projecting' ? (
                            <>
                               <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               <div className="relative overflow-hidden h-5 w-32 flex items-center justify-center">
                                 <AnimatePresence mode="popLayout">
                                   <motion.span
                                     key={loadingTextIndex}
                                     initial={{ y: 20, opacity: 0 }}
                                     animate={{ y: 0, opacity: 1 }}
                                     exit={{ y: -20, opacity: 0 }}
                                     transition={{ duration: 0.3, ease: "easeOut" }}
                                     className="absolute whitespace-nowrap"
                                   >
                                     {loadingMessages[loadingTextIndex]}
                                   </motion.span>
                                 </AnimatePresence>
                               </div>
                            </>
                          ) : 'Submit & Predict'}
                        </button>
                      )}
                    </div>
                 </div>
                ) : (
                 <div className="relative z-10 flex flex-col gap-4">
                   <div className="text-center py-4">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-b from-[#333] to-[#111] rounded-xl flex items-center justify-center border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.5)]">
                         <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <h4 className="text-gray-200 font-bold text-base mb-1">AI Relative Grading</h4>
                      <p className="text-gray-400 text-xs leading-relaxed max-w-[250px] mx-auto">
                        We generate a relative curve based on your existing grades and predict your future performance.
                      </p>
                   </div>

                   <button 
                     onClick={generateQuestions}
                     disabled={phase !== 'idle'}
                     className="relative w-full overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] border border-black text-white font-bold text-sm transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_6px_10px_rgba(0,0,0,0.8)] hover:from-[#4a4a4a] hover:to-[#222] active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_0px_0px_rgba(0,0,0,0)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                   >
                     {phase === 'generating_questions' || phase === 'projecting' ? (
                       <>
                         <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         <div className="relative overflow-hidden h-5 w-32 flex items-center justify-center">
                           <AnimatePresence mode="popLayout">
                             <motion.span
                               key={loadingTextIndex}
                               initial={{ y: 20, opacity: 0 }}
                               animate={{ y: 0, opacity: 1 }}
                               exit={{ y: -20, opacity: 0 }}
                               transition={{ duration: 0.3, ease: "easeOut" }}
                               className="absolute whitespace-nowrap"
                             >
                               {loadingMessages[loadingTextIndex]}
                             </motion.span>
                           </AnimatePresence>
                         </div>
                       </>
                     ) : (
                       <>
                         <span>{projectedState && Object.keys(projectedState).length > 0 ? "Regenerate Prediction" : "Start Prediction"}</span>
                         <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                       </>
                     )}
                   </button>
                 </div>
               )}
             </div>

             {error && (
               <div className="flex-shrink-0 mt-4 p-3 bg-red-900/20 text-red-500 rounded-lg text-xs border border-red-500/20">
                 {error}
               </div>
             )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
