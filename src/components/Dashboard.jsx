import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { academicData } from '../data';
import { 
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, BarElement, Title, RadialLinearScale, PointElement, 
  LineElement, Filler 
} from 'chart.js';
import { Doughnut, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, 
  BarElement, Title, RadialLinearScale, PointElement, LineElement, Filler
);

export default function Dashboard({ marksState }) {
  const [viewType, setViewType] = useState('card');
  const [expandedSubject, setExpandedSubject] = useState(null);

  // --- CALCULATIONS ---
  const { totalSemesterMarks, totalAttempted, totalGained, subjectStats } = useMemo(() => {
    let tMarks = 0;
    let tAttempted = 0;
    let tGained = 0;
    let stats = [];

    const allSubjects = [...academicData.theory, ...academicData.blended, ...academicData.practical];

    allSubjects.forEach(sub => {
      tMarks += sub.total;
      let subAttempted = 0;
      let subGained = 0;

      if (marksState[sub.id]) {
        Object.keys(marksState[sub.id]).forEach(key => {
          const scored = marksState[sub.id][key];
          if (scored !== undefined) {
            subAttempted += sub.weights[key];
            subGained += scored;
          }
        });
      }

      tAttempted += subAttempted;
      tGained += subGained;
      
      const efficiency = subAttempted > 0 ? Math.round((subGained / subAttempted) * 100) : 0;
      stats.push({ ...sub, subAttempted, subGained, efficiency });
    });

    return { totalSemesterMarks: tMarks, totalAttempted: tAttempted, totalGained: tGained, subjectStats: stats };
  }, [marksState]);

  const completionPercent = totalSemesterMarks > 0 ? Math.round((totalAttempted / totalSemesterMarks) * 100) : 0;
  const overallEfficiency = totalAttempted > 0 ? Math.round((totalGained / totalAttempted) * 100) : 0;

  // --- UPGRADED UI PROFILES (Depth, Shadows, Softer Text) ---
  const getPerformanceUI = (efficiency, attempted) => {
    if (attempted === 0) return { 
      card: 'bg-[#18181b] border-white/5 shadow-md', 
      dot: 'bg-zinc-700 shadow-none', 
      percent: 'text-zinc-600' 
    };
    if (efficiency >= 75) return { 
      card: 'bg-gradient-to-br from-[#064e3b]/40 to-[#022c22]/40 border-emerald-900/50 hover:border-emerald-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.5)] shadow-emerald-900/10', 
      dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]', 
      percent: 'text-emerald-400' 
    };
    if (efficiency >= 50) return { 
      card: 'bg-gradient-to-br from-[#78350f]/40 to-[#451a03]/40 border-amber-900/50 hover:border-amber-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.5)] shadow-amber-900/10', 
      dot: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]', 
      percent: 'text-amber-400' 
    };
    return { 
      card: 'bg-gradient-to-br from-[#881337]/40 to-[#4c0519]/40 border-rose-900/50 hover:border-rose-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.5)] shadow-rose-900/10', 
      dot: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]', 
      percent: 'text-rose-500' 
    };
  };

  // --- CHART DATA ---
  const doughnutData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [completionPercent, 100 - completionPercent],
      backgroundColor: (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return ['#10b981', 'rgba(255, 255, 255, 0.03)'];
        
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        if (completionPercent >= 75) {
          gradient.addColorStop(0, '#059669'); gradient.addColorStop(1, '#34d399');
        } else if (completionPercent >= 50) {
          gradient.addColorStop(0, '#d97706'); gradient.addColorStop(1, '#fbbf24');
        } else {
          gradient.addColorStop(0, '#e11d48'); gradient.addColorStop(1, '#fb7185');
        }
        return [gradient, 'rgba(255, 255, 255, 0.03)'];
      },
      borderColor: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)'],
      borderWidth: 1,
    }]
  };

  const barData = {
    labels: subjectStats.map(s => s.name.substring(0, 15) + '...'),
    datasets: [{
      label: 'Subject Efficiency (%)',
      data: subjectStats.map(s => s.efficiency),
      backgroundColor: subjectStats.map(s => s.efficiency >= 75 ? '#34d399' : s.efficiency >= 50 ? '#fbbf24' : '#f43f5e'),
      borderRadius: 6,
    }]
  };

  const radarData = {
    labels: subjectStats.map(s => s.name.substring(0, 12) + '..'),
    datasets: [{
      label: 'Subject Strengths',
      data: subjectStats.map(s => s.efficiency),
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8b5cf6',
      pointBackgroundColor: '#8b5cf6',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#8b5cf6',
      borderWidth: 2,
    }]
  };

  const commonOptions = { plugins: { legend: { display: false } }, maintainAspectRatio: false };

  return (
    // Added relative and z-10 here to ensure it sits above any errant sidebars in your app
    <div className="p-8 text-gray-200 min-h-screen max-w-7xl mx-auto bg-[#0a0a0a] font-sans selection:bg-violet-500/30 relative z-10">
      
      {/* HEADER */}
      <header className="mb-10 flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 pb-1">
            Analytics & Progress
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Semester Performance Dashboard</p>
        </div>
        <Link to="/" className="px-5 py-2 bg-[#121212] border border-white/10 hover:bg-[#18181b] hover:border-violet-500/50 text-gray-300 text-sm font-medium rounded-lg transition-all shadow-md">
          ← Back to Tracker
        </Link>
      </header>

      {/* TOP ROW: SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl shadow-xl flex items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl"></div>
          <div className="w-36 h-36 flex-shrink-0 relative z-10">
            <Doughnut data={doughnutData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-2">Semester Completion</p>
            <h2 className="text-5xl font-black text-white">{completionPercent}%</h2>
            <p className="text-gray-400 mt-2 text-sm">{totalAttempted} / {totalSemesterMarks} Marks Locked In</p>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl shadow-xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase mb-2 relative z-10">Overall Efficiency</p>
          <div className="flex items-end gap-4 relative z-10">
            <h2 className="text-5xl font-black text-white">{overallEfficiency}%</h2>
            <p className="text-gray-400 pb-1 text-lg">Secured</p>
          </div>
          <div className="mt-6 w-full bg-black/60 rounded-full h-2.5 shadow-inner border border-white/5 relative z-10">
            <div className="bg-gradient-to-r from-cyan-400 to-violet-500 h-2.5 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.5)]" style={{ width: `${overallEfficiency}%` }}></div>
          </div>
          <p className="text-gray-400 mt-4 text-sm relative z-10">Gained <span className="text-gray-200 font-bold">{totalGained}</span> out of {totalAttempted} attempted marks.</p>
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        
        {/* Left Col: Charts */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl shadow-xl h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-200 mb-6 flex-shrink-0">Subject Efficiency</h3>
            <div className="flex-1 relative">
              <Bar data={barData} options={{...commonOptions, scales: { y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#6b7280' }, max: 100 }, x: { grid: { display: false }, ticks: { color: '#6b7280' } } }}} />
            </div>
          </div>

          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl shadow-xl h-[450px] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 flex-shrink-0">Strength Matrix</h3>
            <p className="text-sm text-gray-500 mb-4 flex-shrink-0">Visualizing your strongest and weakest subjects.</p>
            <div className="flex-1 relative flex justify-center pb-4">
              <Radar data={radarData} options={{...commonOptions, scales: { r: { angleLines: { color: 'rgba(255, 255, 255, 0.05)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, pointLabels: { color: '#9ca3af', font: { size: 11 } }, ticks: { display: false, max: 100, min: 0 } } }}} />
            </div>
          </div>
        </div>

        {/* Right Col: THE SCROLL BUG FIX 
            1. Fixed height container (h-[882px])
            2. Relative positioning to anchor the overlay
            3. Isolate to block z-index interference from outside sidebars
        */}
        <div className="h-[882px] relative bg-[#121212] border border-white/5 rounded-2xl shadow-2xl flex flex-col isolate">
          
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#151515] z-20 shrink-0 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-gray-200">Subject Breakdown</h3>
          </div>
          
          {/* SCROLLABLE LIST (BULLETPROOF)
              - h-full: Locks it to the parent's remaining height
              - overflow-y-auto: Forces scrollbar
              - overscroll-none: ABSOLUTELY prevents scrolling the parent page
              - pointer-events-auto: Ensures mouse captures work
          */}
          <div className="h-full overflow-y-auto overscroll-none pointer-events-auto p-5 pb-10
                          [&::-webkit-scrollbar]:w-1.5 
                          [&::-webkit-scrollbar-track]:bg-transparent 
                          [&::-webkit-scrollbar-thumb]:bg-[#2a2a2a] 
                          [&::-webkit-scrollbar-thumb]:rounded-full 
                          hover:[&::-webkit-scrollbar-thumb]:bg-[#3a3a3a]">
            
          
              <div className="space-y-4">
                {subjectStats.map(sub => {
                  const ui = getPerformanceUI(sub.efficiency, sub.subAttempted);
                  const isExpanded = expandedSubject === sub.id;

                  return (
                    // Refined Card UI - Flexbox adjusted to fix spacing
                    <div key={sub.id} onClick={() => setExpandedSubject(isExpanded ? null : sub.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer bg-[#000000] transition-all duration-600 ${ui.card}`}>
                      
                      {/* Flex Layout fixed to prevent things hugging the right wall */}
                      <div className="flex justify-between items-center gap-4">
                        
                        {/* Left Side: Dot and Title */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ui.dot} ${sub.subAttempted > 0 && sub.efficiency >= 50 ? 'animate-pulse' : ''}`}></span>
                          <div className="truncate">
                            {/* Softer, non-stark white text */}
                            <h4 className="font-semibold text-[#aaaaaa] text-sm truncate">{sub.name}</h4>
                            <p className="text-[12px] text-[#797979] mt-1 font-medium">
                              {sub.subAttempted === 0 ? 'Not started' : `Gained: ${sub.subGained} / ${sub.subAttempted}`}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Percentage and Arrow - Properly spaced */}
                        <div className="flex items-center gap-3 shrink-0 pl-2">
                          <span className={`text-xl font-bold ${ui.percent}`}>{sub.subAttempted > 0 ? `${sub.efficiency}%` : '-'}</span>
                          <span className={`text-gray-500 text-xs w-4 text-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                        </div>
                      </div>

                      {/* Smooth Accordion */}
                      <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="pt-3 space-y-0" onClick={(e) => e.stopPropagation()}>
                            {Object.keys(sub.weights).map(weightKey => {
                              const max = sub.weights[weightKey];
                              const scored = marksState[sub.id]?.[weightKey];
                              return (
                                <div key={weightKey} className="flex justify-between items-center text-xs bg-[#000000]/30 p-2.5 rounded-lg">
                                  <span className="text-gray-100 capitalize">{weightKey.replace(/_/g, ' ')}</span>
                                  {scored !== undefined ? (
                                    <span className="text-gray-300 font-medium">{scored} <span className="text-gray-600">/ {max}</span></span>
                                  ) : (
                                    <span className="text-gray-600 italic">- / {max}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            
          </div>

          {/* DARK MIST EFFECT */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#121212] to-transparent pointer-events-none rounded-b-2xl"></div>
        </div>

      </div>
    </div>
  );
}