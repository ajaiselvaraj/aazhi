import React, { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface VirtualNumpadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
}

const VirtualNumpad: React.FC<VirtualNumpadProps> = ({ onKeyPress, onDelete }) => {
  const [keys, setKeys] = useState<string[]>([]);

  // Security: Shuffle the array of numbers 0-9 to prevent shoulder surfing
  useEffect(() => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    setKeys(digits);
  }, []);

  if (keys.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto mt-4 select-none touch-manipulation">
      {keys.slice(0, 9).map((key) => (
        <button
          key={key}
          onClick={(e) => { e.preventDefault(); onKeyPress(key); }}
          className="bg-slate-100 hover:bg-slate-200 active:bg-blue-500 active:text-white text-slate-800 font-bold text-2xl py-4 rounded-xl shadow-sm transition-colors duration-150"
        >
          {key}
        </button>
      ))}
      
      {/* Empty slot for alignment */}
      <div></div>

      <button
        onClick={(e) => { e.preventDefault(); onKeyPress(keys[9]); }}
        className="bg-slate-100 hover:bg-slate-200 active:bg-blue-500 active:text-white text-slate-800 font-bold text-2xl py-4 rounded-xl shadow-sm transition-colors duration-150"
      >
        {keys[9]}
      </button>

      <button
        onClick={(e) => { e.preventDefault(); onDelete(); }}
        className="bg-red-50 hover:bg-red-100 active:bg-red-500 active:text-white text-red-500 flex items-center justify-center font-bold text-xl py-4 rounded-xl shadow-sm transition-colors duration-150"
      >
        <Delete size={28} />
      </button>
    </div>
  );
};

export default VirtualNumpad;