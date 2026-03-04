import React from 'react';
import { Link } from 'react-router-dom';
import { academicData } from '../data';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard({ marksState }) {
  // --- CALCULATIONS ---
  let totalSemesterMarks = 0;
  let totalAttempted = 0;
  let totalGained = 0;
  let subjectStats = [];

  const allSubjects = [...academicData.theory, ...academicData.blended, ...academicData.practical];

  allSubjects.forEach(sub => {
    totalSemesterMarks += sub.total;
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

    totalAttempted += subAttempted;
    totalGained += subGained;
    
    const efficiency = subAttempted > 0 ? Math.round((subGained / subAttempted) * 100) : 0;
    subjectStats.push({ ...sub, subAttempted, subGained, efficiency });
  });

  const completionPercent = Math.round((totalAttempted / totalSemesterMarks) * 100);
  const overallEfficiency = totalAttempted > 0 ? Math.round((totalGained / totalAttempted) * 100) : 0;

  // --- CHART DATA ---
  const doughnutData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [completionPercent, 100 - completionPercent],
      backgroundColor: ['#3b82f6', '#1c1c1c'],
      borderColor: ['#2563eb', '#2a2a2a'],
      borderWidth: 1,
    }]
  };

  const barData = {
    labels: subjectStats.map(s => s.name.substring(0, 15) + '...'),
    datasets: [{
      label: 'Subject Efficiency (%)',
      data: subjectStats.map(s => s.efficiency),
      backgroundColor: subjectStats.map(s => s.efficiency >= 75 ? '#34d399' : s.efficiency >= 50 ? '#fbbf24' : '#ef4444'),
      borderRadius: 4,
    }]
  };

  const chartOptions = {
    plugins: { legend: { labels: { color: '#9ca3af' } } },
    scales: {
      y: { grid: { color: '#2a2a2a' }, ticks: { color: '#6b7280' }, max: 100 },
      x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } }
    }
  };

  // --- UI HELPERS ---
  const getPerformanceUI = (efficiency, attempted) => {
    if (attempted === 0) return { color: 'bg-gray-600', text: 'text-gray-500', glow: 'shadow-none', ambient: 'border-gray-800 bg-[#0f0f0f]' };
    if (efficiency >= 75) return { color: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.8)]', ambient: 'border-emerald-900/50 bg-emerald-900/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' };
    if (efficiency >= 50) return { color: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.8)]', ambient: 'border-amber-900/50 bg-amber-900/10 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' };
    return { color: 'bg-red-500', text: 'text-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.8)]', ambient: 'border-red-900/50 bg-red-900/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]' };
  };

  return (
    <div className="p-8 text-gray-200 min-h-screen max-w-7xl mx-auto">
      <header className="mb-10 flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold gradient-text pb-1">Overall Progress</h1>
          <p className="text-gray-500 mt-2">Semester Performance Analytics</p>
        </div>
        <Link to="/" className="px-5 py-2.5 bg-[#1c1c1c] hover:bg-[#2a2a2a] text-gray-300 text-sm font-medium rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          ← Back to Tracker
        </Link>
      </header>

      {/* Top Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#141414] p-8 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] flex items-center gap-8">
          <div className="w-40 h-40 flex-shrink-0">
            <Doughnut data={doughnutData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wider text-gray-500 uppercase mb-2">Semester Completion</p>
            <h2 className="text-5xl font-black text-white">{completionPercent}%</h2>
            <p className="text-gray-400 mt-2 text-sm">{totalAttempted} / {totalSemesterMarks} Marks Locked In</p>
            <p className="text-xs text-gray-600 mt-1">(These are exams you've already taken)</p>
          </div>
        </div>

        <div className="bg-[#141414] p-8 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] flex flex-col justify-center">
          <p className="text-sm font-bold tracking-wider text-gray-500 uppercase mb-2">Overall Efficiency</p>
          <div className="flex items-end gap-4">
            <h2 className="text-5xl font-black text-blue-400">{overallEfficiency}%</h2>
            <p className="text-gray-400 pb-1 text-lg">Secured</p>
          </div>
          <div className="mt-6 w-full bg-[#222] rounded-full h-3 shadow-inner">
            <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${overallEfficiency}%` }}></div>
          </div>
          <p className="text-gray-400 mt-3 text-sm">You have gained <span className="text-white font-bold">{totalGained}</span> out of the {totalAttempted} marks you attempted.</p>
        </div>
      </div>

      {/* Chart & Detailed List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-[#141414] p-6 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-bold text-gray-300 mb-6">Subject Performance Comparison</h3>
          <Bar data={barData} options={chartOptions} />
        </div>

        {/* Detailed Subject Reports */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-lg font-bold text-gray-300 mb-4 sticky top-0 bg-[#0a0a0a] py-2 z-10">Subject Breakdown</h3>
          
          {subjectStats.map(sub => {
            const ui = getPerformanceUI(sub.efficiency, sub.subAttempted);
            return (
              <div key={sub.id} className={`p-4 rounded-xl border transition-all duration-300 ${ui.ambient}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* Blinking Light Indicator */}
                    <span className={`w-2.5 h-2.5 rounded-full ${ui.color} ${sub.subAttempted > 0 ? 'animate-pulse' : ''} ${ui.glow}`}></span>
                    <h4 className="font-semibold text-gray-200 text-sm">{sub.name}</h4>
                  </div>
                  <span className={`font-bold ${ui.text}`}>{sub.subAttempted > 0 ? `${sub.efficiency}%` : '-'}</span>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 ml-5.5">
                  <span>Gained: <strong className="text-gray-300">{sub.subGained}</strong> / {sub.subAttempted}</span>
                  <span>Total: {sub.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}