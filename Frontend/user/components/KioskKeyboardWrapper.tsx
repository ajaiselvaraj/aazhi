import React, { useState, useRef } from 'react';
import VirtualKeyboard, { KeyboardType } from './kiosk/VirtualKeyboard';
import { Language } from '../types';

interface Props {
    children: React.ReactNode;
    language: Language;
}

const KioskKeyboardWrapper: React.FC<Props> = ({ children, language }) => {

    const [isOpen, setIsOpen] = useState(false);
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('TEXT');

    const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);

    const saveCursorPosition = () => {
        const input = activeInputRef.current;
        if (!input || input.type === 'number') return;

        savedSelectionRef.current = {
            start: input.selectionStart ?? 0,
            end: input.selectionEnd ?? 0,
        };
    };

    const handleFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {

        const target = e.target as HTMLElement;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {

            const input = target as HTMLInputElement;

            if (input.readOnly || input.disabled) return;

            const type = input.type;
            const inputMode = input.getAttribute('inputmode');

            let kType: KeyboardType = 'TEXT';

            if (
                type === 'number' ||
                type === 'tel' ||
                inputMode === 'numeric' ||
                inputMode === 'decimal'
            ) {
                kType = 'NUMERIC';
            }

            if (activeInputRef.current && activeInputRef.current !== input) {

                activeInputRef.current.removeEventListener('keyup', saveCursorPosition);
                activeInputRef.current.removeEventListener('click', saveCursorPosition);
                activeInputRef.current.removeEventListener('select', saveCursorPosition);
            }

            activeInputRef.current = input;
            savedSelectionRef.current = null;

            setKeyboardType(kType);
            setIsOpen(true);

            input.addEventListener('keyup', saveCursorPosition);
            input.addEventListener('click', saveCursorPosition);
            input.addEventListener('select', saveCursorPosition);
        }
    };

    const setNativeValue = (element: any, value: string) => {

        const setter = Object.getOwnPropertyDescriptor(
            element.__proto__,
            'value'
        )?.set;

        setter?.call(element, value);

        element.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const handleKeyPress = (key: string) => {

        const input = activeInputRef.current;
        if (!input) return;

        // ⭐ Aadhaar special handling – always append, never use cursor position
        if (input.dataset.type === 'aadhaar') {
            // Only allow digit keys
            if (!/^\d$/.test(key)) return;

            // Strip spaces from display value to get raw digits
            const currentDigits = input.value.replace(/\D/g, '');

            if (currentDigits.length >= 12) return; // already full

            const newDigits = currentDigits + key; // guaranteed ≤ 12 digits

            // Format as XXXX XXXX XXXX for display
            const formatted = newDigits.replace(/(\d{4})(?=\d)/g, '$1 ');

            setNativeValue(input, formatted);

            // Cursor must go to END of the FORMATTED string (not raw digit count)
            const pos = formatted.length;
            savedSelectionRef.current = { start: pos, end: pos };

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(pos, pos);
            }, 0);

            return;
        }

        // Default behaviour
        const start =
            savedSelectionRef.current?.start ??
            input.selectionStart ??
            input.value.length;

        const end =
            savedSelectionRef.current?.end ??
            input.selectionEnd ??
            input.value.length;

        const newVal =
            input.value.substring(0, start) +
            key +
            input.value.substring(end);

        setNativeValue(input, newVal);

        const newCursor = start + key.length;

        savedSelectionRef.current = {
            start: newCursor,
            end: newCursor,
        };

        setTimeout(() => {

            input.focus();
            input.setSelectionRange(newCursor, newCursor);

        }, 0);
    };

    const handleDelete = () => {

        const input = activeInputRef.current;
        if (!input) return;

        // ⭐ Aadhaar – delete last raw digit
        if (input.dataset.type === 'aadhaar') {
            const currentDigits = input.value.replace(/\D/g, '');
            if (currentDigits.length === 0) return;

            const newDigits = currentDigits.slice(0, -1);
            const formatted = newDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
            setNativeValue(input, formatted);

            const pos = formatted.length;
            savedSelectionRef.current = { start: pos, end: pos };

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(pos, pos);
            }, 0);
            return;
        }

        const start = savedSelectionRef.current?.start ?? input.selectionStart ?? 0;
        const end = savedSelectionRef.current?.end ?? input.selectionEnd ?? 0;

        const currentVal = input.value;

        let newVal: string;
        let newCursor: number;

        if (start === end && start > 0) {

            newVal = currentVal.substring(0, start - 1) + currentVal.substring(end);
            newCursor = start - 1;

        } else if (start !== end) {

            newVal = currentVal.substring(0, start) + currentVal.substring(end);
            newCursor = start;

        } else {
            return;
        }

        setNativeValue(input, newVal);

        savedSelectionRef.current = { start: newCursor, end: newCursor };

        setTimeout(() => {

            input.focus();
            input.setSelectionRange(newCursor, newCursor);

        }, 0);
    };

    const handleClear = () => {

        const input = activeInputRef.current;
        if (!input) return;

        setNativeValue(input, '');

        savedSelectionRef.current = { start: 0, end: 0 };

        setTimeout(() => {

            input.focus();
            input.setSelectionRange(0, 0);

        }, 0);
    };

    const handleClose = () => {

        const input = activeInputRef.current;

        if (input) {

            input.removeEventListener('keyup', saveCursorPosition);
            input.removeEventListener('click', saveCursorPosition);
            input.removeEventListener('select', saveCursorPosition);
            input.blur();
        }

        setIsOpen(false);
        activeInputRef.current = null;
        savedSelectionRef.current = null;
    };

    return (
        <div
            className="flex h-screen w-screen overflow-hidden bg-slate-50"
            onFocusCapture={handleFocusCapture}
        >

            <div
                className={`
                transition-all duration-300 ease-in-out h-full overflow-hidden
                ${isOpen ? 'w-[calc(100vw-350px)] md:w-[calc(100vw-600px)]' : 'w-full'}
            `}
            >
                {children}
            </div>

            <div
                className={`
                fixed right-0 top-0 h-full bg-white z-[9999] shadow-2xl
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                w-[350px] md:w-[600px]
            `}
            >
                <VirtualKeyboard
                    isOpen={true}
                    type={keyboardType}
                    language={language}
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onClear={handleClear}
                    onEnter={handleClose}
                    onClose={handleClose}
                />
            </div>
        </div>
    );
};

export default KioskKeyboardWrapper;