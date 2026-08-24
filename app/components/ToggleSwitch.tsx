interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, label, disabled = false }: ToggleSwitchProps) {
  return (
    <label className={`flex items-center ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white peer-checked:after:bg-blue-700 after:border after:border-gray-300 peer-checked:after:border-transparent after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6 shadow-inner"></div>
      </div>
      <span className="ml-3 text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</span>
    </label>
  );
}
