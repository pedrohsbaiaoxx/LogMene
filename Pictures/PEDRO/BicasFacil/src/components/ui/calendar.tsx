import React from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";

const Calendar = () => {
  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav-button">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="calendar-title">Janeiro 2024</span>
        <button className="calendar-nav-button">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {/* Resto do componente do calendário */}
    </div>
  );
};

export default Calendar; 