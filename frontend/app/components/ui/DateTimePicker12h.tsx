'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimePicker12hProps {
  label: string;
  sublabel?: string;
  value?: string | Date; // ISO string or Date
  onChange: (isoString: string, dateObj: Date) => void;
  disabled?: boolean;
}

export default function DateTimePicker12h({
  label,
  sublabel,
  value,
  onChange,
  disabled = false,
}: DateTimePicker12hProps) {
  // Parse initial date
  const parseInitial = () => {
    const d = value ? new Date(value) : new Date(Date.now() + 3600000);
    const valid = !isNaN(d.getTime()) ? d : new Date();

    const year = valid.getFullYear();
    const month = String(valid.getMonth() + 1).padStart(2, '0');
    const day = String(valid.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const rawHours = valid.getHours();
    const period = rawHours >= 12 ? 'PM' : 'AM';
    let hour12 = rawHours % 12;
    if (hour12 === 0) hour12 = 12;

    // Round minute to nearest 5
    const roundedMin = Math.round(valid.getMinutes() / 5) * 5;
    const finalMin = roundedMin >= 60 ? 55 : roundedMin;

    return {
      date: dateStr,
      hour: String(hour12).padStart(2, '0'),
      minute: String(finalMin).padStart(2, '0'),
      period: period as 'AM' | 'PM',
    };
  };

  const [date, setDate] = useState(parseInitial().date);
  const [hour, setHour] = useState(parseInitial().hour);
  const [minute, setMinute] = useState(parseInitial().minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parseInitial().period);

  // Sync if external value changes drastically
  useEffect(() => {
    if (value) {
      const parsed = parseInitial();
      setDate(parsed.date);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [value]);

  const emitChange = (newDate: string, newHour: string, newMin: string, newPeriod: 'AM' | 'PM') => {
    if (!newDate) return;
    try {
      const [y, m, d] = newDate.split('-').map(Number);
      let h24 = parseInt(newHour, 10);
      if (newPeriod === 'PM' && h24 < 12) h24 += 12;
      if (newPeriod === 'AM' && h24 === 12) h24 = 0;

      const dateObj = new Date(y, m - 1, d, h24, parseInt(newMin, 10), 0);
      if (!isNaN(dateObj.getTime())) {
        onChange(dateObj.toISOString(), dateObj);
      }
    } catch (e) {
      console.error('Invalid date format', e);
    }
  };

  const handleDateChange = (val: string) => {
    setDate(val);
    emitChange(val, hour, minute, period);
  };

  const handleHourChange = (val: string) => {
    setHour(val);
    emitChange(date, val, minute, period);
  };

  const handleMinuteChange = (val: string) => {
    setMinute(val);
    emitChange(date, hour, val, period);
  };

  const handlePeriodChange = (val: 'AM' | 'PM') => {
    setPeriod(val);
    emitChange(date, hour, minute, val);
  };

  // Human readable preview
  const formatPreview = () => {
    if (!date) return 'Select date and time';
    try {
      const [y, m, d] = date.split('-').map(Number);
      let h24 = parseInt(hour, 10);
      if (period === 'PM' && h24 < 12) h24 += 12;
      if (period === 'AM' && h24 === 12) h24 = 0;
      const dateObj = new Date(y, m - 1, d, h24, parseInt(minute, 10), 0);
      return dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return `${date} ${hour}:${minute} ${period}`;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Clock size={13} className="text-neon-cyan" />
          <span>{label}</span>
        </label>
        {sublabel && <span className="text-[10px] text-text-muted">{sublabel}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Date Selector */}
        <div className="sm:col-span-6 relative">
          <input
            type="date"
            disabled={disabled}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-neon-cyan transition-colors disabled:opacity-50"
          />
        </div>

        {/* 12-Hour Dropdown */}
        <div className="sm:col-span-2">
          <select
            disabled={disabled}
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="w-full bg-[#121624] border border-white/10 rounded-xl px-2 py-2 text-xs sm:text-sm text-white font-mono font-bold outline-none focus:border-neon-cyan transition-colors disabled:opacity-50"
          >
            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Minute Dropdown */}
        <div className="sm:col-span-2">
          <select
            disabled={disabled}
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="w-full bg-[#121624] border border-white/10 rounded-xl px-2 py-2 text-xs sm:text-sm text-white font-mono font-bold outline-none focus:border-neon-cyan transition-colors disabled:opacity-50"
          >
            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
              <option key={m} value={m}>
                :{m}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Toggle */}
        <div className="sm:col-span-2 flex rounded-xl border border-white/10 overflow-hidden bg-white/5 p-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('AM')}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              period === 'AM'
                ? 'bg-neon-cyan text-black shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('PM')}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
              period === 'PM'
                ? 'bg-neon-purple text-white shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Live 12h Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-text-muted">
        <span className="text-neon-cyan font-bold">12h Clock:</span>
        <span className="text-white font-medium">{formatPreview()}</span>
      </div>
    </div>
  );
}
