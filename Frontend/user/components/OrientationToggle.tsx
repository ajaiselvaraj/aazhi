/**
 * OrientationToggle
 *
 * A self-contained, reusable button that reads from & writes to the
 * shared OrientationContext.  Drop it anywhere in the UI.
 *
 * Props
 *   variant  "icon"  – icon only (compact, for header toolbars)
 *            "badge" – icon + label text (default, for footers / panels)
 *            "pill"  – large rounded pill (for landing page / kiosk idlescreen)
 */

import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useOrientation } from '../contexts/OrientationContext';

interface OrientationToggleProps {
  variant?: 'icon' | 'badge' | 'pill';
  className?: string;
}

const OrientationToggle: React.FC<OrientationToggleProps> = ({
  variant = 'badge',
  className = '',
}) => {
  const { isVertical, toggleOrientation } = useOrientation();

  const label = isVertical ? 'Horizontal' : 'Kiosk Mode';
  const Icon = isVertical ? Monitor : Smartphone;
  const title = isVertical
    ? 'Switch to Horizontal (Landscape) Mode'
    : 'Switch to Vertical (Portrait / Kiosk) Mode';

  /* ── Icon only ── */
  if (variant === 'icon') {
    return (
      <button
        onClick={toggleOrientation}
        title={title}
        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-all duration-200 ${className}`}
      >
        <Icon size={18} />
      </button>
    );
  }

  /* ── Large pill ── */
  if (variant === 'pill') {
    return (
      <button
        onClick={toggleOrientation}
        title={title}
        className={`
          orientation-toggle
          px-6 py-3 rounded-2xl text-sm
          shadow-lg shadow-blue-100
          ${isVertical
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
          }
          ${className}
        `}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    );
  }

  /* ── Default badge ── */
  return (
    <button
      onClick={toggleOrientation}
      title={title}
      className={`orientation-toggle ${className}`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
};

export default OrientationToggle;
