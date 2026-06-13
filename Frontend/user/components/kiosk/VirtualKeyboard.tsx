import React, { useState, useRef, useEffect } from 'react';
import { Delete, Check, ChevronDown, GripHorizontal, ArrowBigUp, CornerDownLeft } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../contexts/OrientationContext';

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
    [Language.ENGLISH]: [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ],
    [Language.TAMIL]: [
        ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
        ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர'],
        ['ல', 'வ', 'ழ', 'ள', 'ற', 'ன', 'ஜ', 'ஷ', 'ஸ', 'ஹ']
    ],
    [Language.HINDI]: [
        ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'],
        ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'],
        ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ'],
        ['ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह']
    ],
    [Language.MALAYALAM]: [],
    [Language.TELUGU]: [],
    [Language.KANNADA]: [],
};

// Fill fallbacks with English for now
LAYOUTS[Language.MALAYALAM] = LAYOUTS[Language.ENGLISH];
LAYOUTS[Language.TELUGU] = LAYOUTS[Language.ENGLISH];
LAYOUTS[Language.KANNADA] = LAYOUTS[Language.ENGLISH];

const NUMERIC_SYMBOLS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['.', ',', '?', '!', '\'']
];

const EXTRA_SYMBOLS = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
    ['.', ',', '?', '!', '\'']
];

type KeyboardMode = 'ALPHA' | 'NUM_SYM' | 'EXTRA_SYM';

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ isOpen, type, language, onKeyPress, onDelete, onClear, onClose, onEnter }) => {
    const { t } = useTranslation();
    const { isVertical } = useOrientation();
    const [isShift, setIsShift] = useState(false);
    const [isCaps, setIsCaps] = useState(false);
    const [mode, setMode] = useState<KeyboardMode>('ALPHA');
    const lastShiftTap = useRef<number>(0);
    const deleteInterval = useRef<NodeJS.Timeout | null>(null);
    const deleteTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (deleteTimeout.current) clearTimeout(deleteTimeout.current);
            if (deleteInterval.current) clearInterval(deleteInterval.current);
        };
    }, []);

    const startDelete = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        onDelete();
        deleteTimeout.current = setTimeout(() => {
            deleteInterval.current = setInterval(() => {
                onDelete();
            }, 100);
        }, 500);
    };

    const stopDelete = () => {
        if (deleteTimeout.current) {
            clearTimeout(deleteTimeout.current);
            deleteTimeout.current = null;
        }
        if (deleteInterval.current) {
            clearInterval(deleteInterval.current);
            deleteInterval.current = null;
        }
    };

    if (!isOpen) return null;

    const isNumeric = type === 'NUMERIC';
    const currentLayout = LAYOUTS[language] || LAYOUTS[Language.ENGLISH];

    const handleKeyClick = (key: string) => {
        let finalKey = key;
        if (mode === 'ALPHA' && (isShift || isCaps)) {
            finalKey = key.toUpperCase();
        }
        onKeyPress(finalKey);

        // Turn off single-shift after typing a letter
        if (isShift && !isCaps && mode === 'ALPHA' && key !== ' ') {
            setIsShift(false);
        }
    };

    const handleShift = () => {
        const now = Date.now();
        if (now - lastShiftTap.current < 300) {
            setIsCaps(true);
            setIsShift(true);
        } else {
            if (isCaps) {
                setIsCaps(false);
                setIsShift(false);
            } else {
                setIsShift(!isShift);
            }
        }
        lastShiftTap.current = now;
    };

    const toggleMode = () => {
        if (mode === 'ALPHA') setMode('NUM_SYM');
        else if (mode === 'NUM_SYM') setMode('ALPHA');
        else setMode('ALPHA');
    };

    const toggleExtraSymbols = () => {
        if (mode === 'NUM_SYM') setMode('EXTRA_SYM');
        else if (mode === 'EXTRA_SYM') setMode('NUM_SYM');
    };

    const renderKey = (key: string, flex?: string) => {
        const displayKey = (mode === 'ALPHA' && (isShift || isCaps)) ? key.toUpperCase() : key;
        return (
            <button
                key={key}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => handleKeyClick(key)}
                className={`relative flex items-center justify-center bg-white rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-2xl font-medium text-slate-800 hover:bg-slate-50 active:translate-y-[2px] active:shadow-none transition-all select-none ${flex || 'flex-1'}`}
                style={{ height: isVertical ? '64px' : '56px', minWidth: '8%' }}
            >
                {displayKey}
            </button>
        );
    };

    const NUMPAD_KEYS = [
        { key: '1', sub: '_,@' },
        { key: '2', sub: 'ABC' },
        { key: '3', sub: 'DEF' },
        { key: '4', sub: 'GHI' },
        { key: '5', sub: 'JKL' },
        { key: '6', sub: 'MNO' },
        { key: '7', sub: 'PQRS' },
        { key: '8', sub: 'TUV' },
        { key: '9', sub: 'WXYZ' },
        { key: '*', sub: '_' },
        { key: '0', sub: '' },
        { key: '#', sub: '' }
    ];

    const renderNumpad = () => (
        <div className="flex flex-col gap-3 h-full max-h-[500px] mx-auto w-full max-w-sm px-4 pb-4">
            <div className="grid gap-3 flex-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
                {NUMPAD_KEYS.map(item => {
                    const hasSub = !!item.sub;
                    return (
                        <button
                            key={item.key}
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={() => handleKeyClick(item.key)}
                            className={`bg-white rounded-2xl shadow-[0_3px_0_0_rgba(156,163,175,1)] hover:bg-slate-50 active:translate-y-[3px] active:shadow-none transition-all w-full h-full flex items-center ${
                                hasSub ? 'justify-between px-5' : 'justify-center'
                            }`}
                        >
                            <span className="text-4xl font-extrabold text-slate-800">{item.key}</span>
                            {hasSub && <span className="text-base font-bold text-slate-400 tracking-wider">{item.sub}</span>}
                        </button>
                    );
                })}
            </div>
            
            <div className="grid gap-3 mt-2 h-[72px]" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <button onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} onClick={onClear} className="bg-red-50 rounded-2xl shadow-[0_3px_0_0_rgba(254,202,202,1)] text-red-600 font-bold text-sm uppercase tracking-wider hover:bg-red-100 active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center">
                    {t('kb_clear') || 'Clear'}
                </button>
                <button 
                    onMouseDown={startDelete} 
                    onTouchStart={startDelete} 
                    onMouseUp={stopDelete}
                    onMouseLeave={stopDelete}
                    onTouchEnd={stopDelete}
                    onTouchCancel={stopDelete}
                    className="bg-slate-200 rounded-2xl shadow-[0_3px_0_0_rgba(203,213,225,1)] text-slate-700 hover:bg-slate-300 active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center"
                >
                    <Delete size={28} />
                </button>
                <button onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} onClick={onEnter} className="bg-blue-600 rounded-2xl shadow-[0_3px_0_0_rgba(37,99,235,1)] text-white font-bold text-sm uppercase tracking-wider hover:bg-blue-700 active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-1">
                    <Check size={20} /> {t('kb_done') || 'Done'}
                </button>
            </div>
        </div>
    );

    const renderFullKeyboard = () => {
        const layoutRows = mode === 'ALPHA' ? currentLayout : (mode === 'NUM_SYM' ? NUMERIC_SYMBOLS : EXTRA_SYMBOLS);

        return (
            <div className="flex flex-col w-full h-full gap-[8px] max-w-5xl mx-auto px-2 pb-2 mt-2">
                {layoutRows.map((row, rowIndex) => {
                    const isMiddleAlpha = mode === 'ALPHA' && rowIndex === 1 && language === Language.ENGLISH;
                    const isLastRow = rowIndex === layoutRows.length - 1;

                    return (
                        <div key={rowIndex} className="flex flex-row justify-center gap-[6px] md:gap-[10px] w-full">
                            {isMiddleAlpha && <div className="flex-[0.5]"></div>}
                            
                            {isLastRow && (
                                mode === 'ALPHA' && language !== Language.ENGLISH ? null :
                                mode === 'ALPHA' ? (
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={handleShift}
                                        className={`flex-[1.5] flex items-center justify-center rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] active:translate-y-[2px] active:shadow-none transition-all ${isCaps ? 'bg-blue-600 text-white shadow-[0_2px_0_0_rgba(37,99,235,1)]' : (isShift ? 'bg-slate-300 text-slate-800' : 'bg-slate-200 text-slate-700')}`}
                                        style={{ height: isVertical ? '64px' : '56px' }}
                                    >
                                        <ArrowBigUp size={28} fill={isCaps || isShift ? 'currentColor' : 'none'} />
                                    </button>
                                ) : (
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={toggleExtraSymbols}
                                        className="flex-[1.5] flex items-center justify-center bg-slate-200 rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-lg font-bold text-slate-700 active:translate-y-[2px] active:shadow-none transition-all"
                                        style={{ height: isVertical ? '64px' : '56px' }}
                                    >
                                        {mode === 'NUM_SYM' ? '#+=' : '123'}
                                    </button>
                                )
                            )}

                            {/* Render letters */}
                            {row.map(key => renderKey(key))}

                            {isLastRow && (
                                <button
                                    onMouseDown={startDelete}
                                    onTouchStart={startDelete}
                                    onMouseUp={stopDelete}
                                    onMouseLeave={stopDelete}
                                    onTouchEnd={stopDelete}
                                    onTouchCancel={stopDelete}
                                    className="flex-[1.5] flex items-center justify-center bg-slate-200 rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-slate-700 active:translate-y-[2px] active:shadow-none transition-all"
                                    style={{ height: isVertical ? '64px' : '56px' }}
                                >
                                    <Delete size={28} />
                                </button>
                            )}
                            
                            {isMiddleAlpha && <div className="flex-[0.5]"></div>}
                        </div>
                    );
                })}

                {/* Bottom Control Row */}
                <div className="flex flex-row justify-center gap-[6px] md:gap-[10px] w-full mt-1">
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={toggleMode}
                        className="flex-[1.5] flex items-center justify-center bg-slate-200 rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-lg font-bold text-slate-700 active:translate-y-[2px] active:shadow-none transition-all"
                        style={{ height: isVertical ? '64px' : '56px' }}
                    >
                        {mode === 'ALPHA' ? '?123' : 'ABC'}
                    </button>
                    
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => handleKeyClick(',')}
                        className="flex-[1] flex items-center justify-center bg-white rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-2xl font-medium text-slate-800 active:translate-y-[2px] active:shadow-none transition-all"
                        style={{ height: isVertical ? '64px' : '56px' }}
                    >
                        ,
                    </button>

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => handleKeyClick(' ')}
                        className="flex-[5] flex items-center justify-center bg-white rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-slate-800 active:translate-y-[2px] active:shadow-none transition-all text-xl font-bold"
                        style={{ height: isVertical ? '64px' : '56px' }}
                    >
                        {mode === 'ALPHA' ? (t('kb_space') || 'space') : 'space'}
                    </button>

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => handleKeyClick('.')}
                        className="flex-[1] flex items-center justify-center bg-white rounded-xl shadow-[0_2px_0_0_rgba(156,163,175,1)] text-2xl font-medium text-slate-800 active:translate-y-[2px] active:shadow-none transition-all"
                        style={{ height: isVertical ? '64px' : '56px' }}
                    >
                        .
                    </button>

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={onEnter}
                        className="flex-[1.5] flex items-center justify-center bg-blue-600 rounded-xl shadow-[0_2px_0_0_rgba(37,99,235,1)] text-white active:translate-y-[2px] active:shadow-none transition-all"
                        style={{ height: isVertical ? '64px' : '56px' }}
                    >
                        <CornerDownLeft size={28} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div data-keyboard-container="true" className={`h-full w-full bg-[#d1d5db] flex flex-col shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]
            ${isVertical 
                ? 'animate-in slide-in-from-bottom duration-300' 
                : 'border-l border-slate-300 animate-in slide-in-from-right duration-300'
            }
        `}>
            {/* Header / Grabber */}
            <div className="bg-[#e5e7eb] px-4 py-2 flex items-center justify-between border-b border-slate-300/60 shadow-sm z-10">
                <div className="flex items-center gap-2 text-slate-600">
                    <GripHorizontal size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">
                        {isNumeric ? (t('kb_numpad') || 'Numpad') : (t('kb_keyboard') || 'Keyboard')}
                    </span>
                </div>
                <button onClick={onClose} className="bg-slate-300 p-2 rounded-xl hover:bg-slate-400 hover:text-white transition active:scale-95">
                    <ChevronDown size={22} />
                </button>
            </div>

            {/* Keyboard Body */}
            <div className="flex-1 p-2 overflow-y-auto bg-[#d1d5db]">
                {isNumeric ? renderNumpad() : renderFullKeyboard()}
            </div>
        </div>
    );
};

export default VirtualKeyboard;
