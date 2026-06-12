import React from 'react';
import './TimePicker.css';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, minute] = value ? value.split(':') : ['08', '00'];

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    onChange(`${hour}:${newMinute}`);
  };

  return (
    <div className="time-picker">
      <select className="time-select" value={hour} onChange={handleHourChange}>
        {HOURS.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="time-separator">:</span>
      <select className="time-select" value={minute} onChange={handleMinuteChange}>
        {MINUTES.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
};
