import React, { useState, useEffect } from 'react';

export default function Modals({ modalState, closeModals, saveMarks, marksState }) {
  // Local state to handle smooth enter/exit animations
  const [renderState, setRenderState] = useState({ type: null, subject: null });
  const [isVisible, setIsVisible] = useState(false);
  const [localForm, setLocalForm] = useState({});

  useEffect(() => {
    if (modalState.type) {
      setRenderState(modalState);
      setLocalForm(marksState[modalState.subject.id] || {});
      // Small delay to allow DOM to mount before triggering CSS transition (Fade Up)
      setTimeout(() => setIsVisible(true), 10);
    } else {
      // Trigger CSS transition out (Fade Down)
      setIsVisible(false);
      // Wait for the animation to finish before removing the component from DOM
      const timer = setTimeout(() => {
        setRenderState({ type: null, subject: null });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalState, marksState]);

  if (!renderState.type || !renderState.subject) return null;

  const { type, subject } = renderState;

  const handleSave = () => {
    saveMarks(subject.id, localForm);
    closeModals(); // This triggers the exit animation
  };

  const handleInputChange = (key, value, maxWeight) => {
    setLocalForm(prev => {
      const updated = { ...prev };
      if (value === "") {
        delete updated[key];
      } else {
        let parsedVal = parseFloat(value);
        if (parsedVal < 0) parsedVal = 0;
        if (parsedVal > maxWeight) parsedVal = maxWeight;
        updated[key] = parsedVal;
      }
      return updated;
    });
  };

  // --- STATS CALCULATION ---
  const scored = marksState[subject.id] || {};
  let attemptedMax = 0;
  let actualScored = 0;

  Object.keys(scored).forEach(key => {
    if (scored[key] !== undefined && scored[key] !== null) {
      attemptedMax += subject.weights[key];
      actualScored += scored[key];
    }
  });

  const footprint = Math.round((attemptedMax / subject.total) * 100);
  const efficiency = attemptedMax > 0 ? Math.round((actualScored / attemptedMax) * 100) : 0;

  // Animation Classes
  const overlayClass = `fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`;
  
  // Fade up/down + subtle scale effect
  const modalClass = `bg-[#141414] rounded-2xl w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] transition-all duration-300 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`;

  return (
    <div className={overlayClass}>
      
      {/* --- FORM MODAL --- */}
      {type === 'form' && (
        <div className={`${modalClass} max-w-[500px] p-7`}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-200 tracking-wide">Update Marks</h3>
            <p className="text-gray-500 text-xs mt-1">{subject.name}</p>
          </div>
          
          {/* Square Cards Grid */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(subject.weights).map(([key, maxWeight]) => {
              const isFilled = localForm[key] !== undefined && localForm[key] !== "";
              return (
                <div 
                  key={key} 
                  className={`flex flex-col justify-center items-center aspect-square p-4 rounded-2xl transition-all duration-300 ${
                    isFilled 
                      ? 'bg-[#0a0a0a] opacity-50 hover:opacity-100 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]' 
                      : 'bg-[#181818] border border-gray-700/50 shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  <span className={`text-sm font-bold uppercase tracking-widest mb-3 ${isFilled ? 'text-gray-500' : 'text-gray-400'}`}>
                    {key}
                  </span>
                  
                  <label className={`flex items-center justify-center w-full rounded-xl py-2 px-1 cursor-text transition-all ${
                    isFilled 
                      ? 'bg-[#111] text-gray-400 shadow-inner hover:text-gray-200' 
                      : 'bg-[#222] text-gray-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-[#2a2a2a]'
                  }`}>
                    <input
                      type="number"
                      max={maxWeight}
                      min="0"
                      value={localForm[key] !== undefined ? localForm[key] : ""}
                      onChange={(e) => handleInputChange(key, e.target.value, maxWeight)}
                      className={`w-1/2 text-right bg-transparent text-xl font-bold focus:outline-none placeholder-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isFilled ? 'text-gray-400 focus:text-gray-200' : 'text-white'
                      }`}
                      placeholder="-"
                    />
                    <span className="w-1/2 text-left text-lg font-bold ml-0.5">/{maxWeight}</span>
                  </label>
                </div>
              );
            })}
          </div>
          
          <div className="mt-7 flex justify-end space-x-3 pt-2">
            <button 
              onClick={closeModals} 
              className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 hover:border-gray-500 text-gray-300 text-xs font-medium rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="px-5 py-2 bg-[#2a2a2a] hover:bg-[#383838] text-gray-200 text-xs font-medium rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            >
              Save Marks
            </button>
          </div>
        </div>
      )}

      {/* --- STATS MODAL --- */}
      {type === 'stats' && (
        <div className={`${modalClass} max-w-2xl p-8`}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-200">{subject.name}</h3>
              <p className="text-gray-500 text-sm mt-1">Performance Overview</p>
            </div>
            <button onClick={closeModals} className="text-gray-600 hover:text-gray-300 transition-colors text-lg">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Circular Progress */}
            <div className="flex flex-col items-center justify-center p-5 bg-[#0c0c0c] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path className="fill-none stroke-[#222] stroke-[3.8]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="fill-none stroke-gray-400 stroke-[2.8] transition-all duration-500 ease-out" strokeLinecap="round" strokeDasharray={`${footprint}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-200">{footprint}%</div>
              </div>
              <p className="mt-4 text-xs text-gray-500 text-center tracking-wide">Course Footprint<br/>(Total Attempted)</p>
            </div>

            {/* Linear Progress */}
            <div className="flex flex-col justify-center space-y-7">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Marks Secured</span>
                  <span className="text-xs font-bold text-gray-200">{actualScored} / {attemptedMax}</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-2.5 shadow-inner">
                  <div className="bg-gray-400 h-2.5 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(156,163,175,0.4)]" style={{ width: `${efficiency}%` }}></div>
                </div>
              </div>
              
              <div className="p-4 bg-[#1a1a1a] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Live Efficiency</p>
                <p className="text-lg font-bold text-gray-200">{efficiency}% <span className="text-sm font-normal text-gray-500">Overall</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}