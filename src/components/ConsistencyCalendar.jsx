import { useState } from 'react';
import './ConsistencyCalendar.css'; 

// Helper to get days in a month
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...

export default function ConsistencyCalendar({ logs = {} }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth); 
  
  // Create blank slots for days before the 1st of the month
  const blanks = Array(firstDay).fill(null); 
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { 
      setCurrentMonth(11); 
      setCurrentYear(currentYear - 1); 
    } else { 
      setCurrentMonth(currentMonth - 1); 
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { 
      setCurrentMonth(0); 
      setCurrentYear(currentYear + 1); 
    } else { 
      setCurrentMonth(currentMonth + 1); 
    }
  };

  const getStatusColor = (day) => {
    // Format date as YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = logs[dateStr];
    
    const currentDayDate = new Date(currentYear, currentMonth, day);
    // Reset hours to compare dates properly (ignore time)
    currentDayDate.setHours(0,0,0,0);
    const todayZero = new Date(today);
    todayZero.setHours(0,0,0,0);

    const isFuture = currentDayDate > todayZero;

    if (isFuture) return 'future-day'; 
    if (status === 'present') return 'present-day'; // Green
    if (status === 'excused') return 'excused-day'; // Blue
    // If date is past and no log found, assume absent (Red)
    if (!status && currentDayDate < todayZero) return 'absent-day'; 
    return 'empty-day'; // Current day if not logged yet
  };

  return (
    <div className="calendar-container">
      {/* Header: Month & Navigation */}
      <div className="calendar-header">
        <button onClick={handlePrevMonth}>&lt;</button>
        <span>
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button 
          onClick={handleNextMonth} 
          disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()}
        >
          &gt;
        </button>
      </div>

      {/* Days Grid */}
      <div className="calendar-grid">
        {/* Day Labels (S, M, T...) */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="day-label">{d}</div>
        ))}
        
        {/* Empty slots for start of month */}
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="calendar-day empty"></div>
        ))}
        
        {/* Actual Days */}
        {days.map(day => (
          <div key={day} className="calendar-day-wrapper">
            <div 
              className={`calendar-dot ${getStatusColor(day)}`} 
              title={`${new Date(currentYear, currentMonth, day).toDateString()}`}
            >
              {day} {/* SHOW DATE NUMBER */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}