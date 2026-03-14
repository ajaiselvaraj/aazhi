import React from 'react';
import { speakText } from '../utils/speak';

export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    speakLabel?: string; // Optional: custom text to speak instead of the visible label
    language: string; // The current selected language (e.g., 'English', 'Hindi')
    largeFont?: boolean; // Large font compatibility for senior citizens
}

/**
 * An Accessible Button for kiosks that speaks its label on touch/click 
 * and provides large typography and visible focus states.
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
    label,
    speakLabel,
    language,
    largeFont = true,
    onClick,
    className = '',
    ...props
}) => {
    const handleInteraction = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Speak on click or touch
        speakText({
            text: speakLabel || label,
            language: language
        });

        // Call original onClick handler if provided
        if (onClick) {
            onClick(e);
        }
    };

    return (
        <button
            onClick={handleInteraction}
            // Using large padding (p-6), rounded corners, clear contrast, and focus states
            className={`
        flex items-center justify-center p-6 rounded-2xl border-2 border-gray-300 
        bg-white text-gray-900 shadow-md hover:bg-gray-50 hover:shadow-lg
        dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700
        focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500
        active:scale-95 transition-all duration-200 select-none
        ${largeFont ? 'text-2xl md:text-3xl font-bold min-h-[80px] min-w-[160px]' : 'text-lg font-medium'} 
        ${className}
      `}
            aria-label={label}
            type="button"
            {...props}
        >
            {label}
        </button>
    );
};
