import React, { useEffect, useState } from 'react';
import { Delete, Check, X, ChevronDown, Space, GripHorizontal } from 'lucide-react';
import { Language } from '../../types';

export type KeyboardType = 'NUMERIC' | 'TEXT' | 'ALPHANUMERIC';

interface VirtualKeyboardProps {
    isOpen: boolean;
    type: KeyboardType;
    language: Language;
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    onClear: () => void;
    onClose: () => void;
    onEnter: () => void;
}

const LAYOUTS = {
    [Language.ENGLISH]: {
        rows: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ]
    },
    [Language.TAMIL]: {
        rows: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
            ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர'],
            ['ல', 'வ', 'ழ', 'ள', 'ற', 'ன', 'ஜ', 'ஷ', 'ஸ', 'ஹ']
        ]
    },
    [Language.HINDI]: {
        rows: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'],
            ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'],
            ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न'],
            ['प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह']
        ]
    },
    // Fallbacks
    [Language.MALAYALAM]: { rows: [] },
    [Language.TELUGU]: { rows: [] },
    [Language.KANNADA]: { rows: [] },
};

// Fill fallbacks with English for now
LAYOUTS[Language.MALAYALAM] = LAYOUTS[Language.ENGLISH];
LAYOUTS[Language.TELUGU] = LAYOUTS[Language.ENGLISH];
LAYOUTS[Language.KANNADA] = LAYOUTS[Language.ENGLISH];

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isOpen, type, language, onKeyPress, onDelete, onClear, onClose, onEnter }) => {

    if (!isOpen) return null;

    const currentLayout = LAYOUTS[language] || LAYOUTS[Language.ENGLISH];
    const isNumeric = type === 'NUMERIC';

    const handleKeyClick = (key: string) => {
        onKeyPress(key);
    };

    return (
        <div className="h-full bg-slate-100 flex flex-col border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-slate-200 p-4 flex items-center justify-between border-b border-slate-300">
                <div className="flex items-center gap-2 text-slate-500">
                    <GripHorizontal size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">{isNumeric ? 'Numpad' : 'Keyboard'}</span>
                </div>
                <button onClick={onClose} className="bg-slate-300 p-2 rounded-lg hover:bg-slate-400 hover:text-white transition">
                    <ChevronDown size={20} />
                </button>
            </div>

            {/* Keyboard Body */}
            <div className="flex-1 p-4 overflow-y-auto">
                {isNumeric ? (
                    // NUMERIC PAD
                    <div className="flex flex-col gap-3 h-full max-h-[500px] mx-auto w-full max-w-xs">
                        <div className="grid grid-cols-3 gap-3 flex-1">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                                <button
                                    key={num}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleKeyClick(num)}
                                    className="bg-white rounded-2xl shadow-sm text-3xl font-black text-slate-700 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 h-full"
                                >
                                    {num}
                                </button>
                            ))}
                            {/* Row 4 */}
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleKeyClick('-')} className="bg-slate-50 rounded-2xl shadow-sm text-2xl font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition border-b-4 border-slate-200 active:border-b-0 active:translate-y-1">
                                -
                            </button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleKeyClick('0')} className="bg-white rounded-2xl shadow-sm text-3xl font-black text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition border-b-4 border-slate-200 active:border-b-0 active:translate-y-1">
                                0
                            </button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleKeyClick('.')} className="bg-slate-50 rounded-2xl shadow-sm text-2xl font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition border-b-4 border-slate-200 active:border-b-0 active:translate-y-1">
                                .
                            </button>
                        </div>

                        {/* Control Row */}
                        <div className="grid grid-cols-2 gap-3 h-20">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="bg-red-50 rounded-2xl shadow-sm text-red-600 font-black text-xs uppercase tracking-wider hover:bg-red-100 transition border-b-4 border-red-100 active:border-b-0 active:translate-y-1">
                                Clear
                            </button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={onDelete} className="bg-slate-200 rounded-2xl shadow-sm text-slate-600 flex items-center justify-center hover:bg-slate-300 transition border-b-4 border-slate-300 active:border-b-0 active:translate-y-1">
                                <Delete size={28} />
                            </button>
                        </div>
                    </div>
                ) : (
                    // FULL KEYBOARD
                    <div className="flex flex-col gap-2 h-full">
                        {currentLayout.rows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex gap-2 justify-center">
                                {row.map((key) => (
                                    <button
                                        key={key}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleKeyClick(key)}
                                        className="flex-1 min-w-[36px] h-14 bg-white rounded-xl shadow-sm text-xl font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-all border-b-2 border-slate-200"
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        ))}

                        {/* Action Row */}
                        <div className="flex gap-2 mt-2">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="px-6 h-14 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase shadow-sm border-b-2 border-red-100 active:border-b-0 active:translate-y-0.5">
                                Clear
                            </button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleKeyClick(' ')} className="flex-1 h-14 bg-white text-slate-400 rounded-xl shadow-sm border-b-2 border-slate-200 active:border-b-0 active:translate-y-0.5 flex items-center justify-center gap-2">
                                <Space size={20} /> Space
                            </button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={onDelete} className="px-6 h-14 bg-slate-200 text-slate-600 rounded-xl shadow-sm border-b-2 border-slate-300 active:border-b-0 active:translate-y-0.5 flex items-center justify-center">
                                <Delete size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Confirm */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onEnter}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-lg uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                    <Check size={24} /> {isNumeric ? 'Confirm' : 'Done'}
                </button>
            </div>
        </div>
    );
};

export default VirtualKeyboard;
