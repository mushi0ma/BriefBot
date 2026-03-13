import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <label className={`relative flex h-7 w-12 cursor-pointer items-center rounded-full p-1 transition-colors ${
      checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <div
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </label>
  );
};
