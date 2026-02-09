import React, { useState, useRef, useEffect } from 'react';
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

    // Prevent native keyboard on mobile/touch devices if possible
    // but mostly this is for a kiosk where no phys keyboard exists.

    const handleFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            const input = target as HTMLInputElement;

            // Check if readonly
            if (input.readOnly || input.disabled) return;

            const type = input.type;
            const inputMode = input.getAttribute('inputmode');

            // Determine Keyboard Type
            let kType: KeyboardType = 'TEXT';
            if (type === 'number' || type === 'tel' || inputMode === 'numeric' || inputMode === 'decimal') {
                kType = 'NUMERIC';
            } else if (inputMode === 'email' || type === 'email') {
                kType = 'TEXT'; // Could be specialized later
            }

            activeInputRef.current = input;
            setKeyboardType(kType);
            setIsOpen(true);
        }
    };

    // Handle clicks outside to close? 
    // The requirement says: "Input panel must remain visible until... User taps outside input field... User presses Done"
    // Capturing click outside might be tricky if we want to allow clicking *other* inputs.
    // Actually, if we click another input, focus capture runs again and keeps it open (possibly changing type).
    // If we click non-input, we should close.
    // BUT the VirtualKeyboard itself is part of the clickable area.

    // Let's use a click listener on the wrapper? 
    // Or just rely on the 'Done' button for now, or blur?
    // "User taps outside input field" -> blur.

    // BUT blur fires when clicking the VirtualKeyboard buttons! That's the classic problem.
    // We need to prevent blur when interacting with keyboard.
    // VirtualKeyboard buttons should call `preventDefault` on mousedown/touchstart to prevent focus loss.
    // But then the caret might be lost.
    // Solution: Refocus the input after keypress, or keep focus.

    const handleInputUpdate = (cb: (currentVal: string) => string) => {
        const input = activeInputRef.current;
        if (!input) return;

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        const newVal = cb(input.value);

        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, newVal);
        } else {
            input.value = newVal;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const handleKeyPress = (key: string) => {
        const input = activeInputRef.current;
        if (!input) return;

        const isNumberType = input.type === 'number';

        if (!isNumberType && input.selectionStart !== null) {
            const start = input.selectionStart || input.value.length;
            const end = input.selectionEnd || input.value.length;
            const newVal = input.value.substring(0, start) + key + input.value.substring(end);

            handleInputUpdate(() => newVal);

            // Restore cursor
            requestAnimationFrame(() => {
                input.setSelectionRange(start + 1, start + 1);
            });
        } else {
            // Append Only for number types or if selection not supported
            handleInputUpdate((val) => val + key);
        }
    };

    const handleDelete = () => {
        const input = activeInputRef.current;
        if (!input) return;

        const isNumberType = input.type === 'number';

        if (!isNumberType && input.selectionStart !== null) {
            const start = input.selectionStart || input.value.length;
            const end = input.selectionEnd || input.value.length;

            if (start === end && start > 0) {
                // Delete character before cursor
                const newVal = input.value.substring(0, start - 1) + input.value.substring(end);
                handleInputUpdate(() => newVal);
                requestAnimationFrame(() => {
                    input.setSelectionRange(start - 1, start - 1);
                });
            } else if (start !== end) {
                // Delete selection
                const newVal = input.value.substring(0, start) + input.value.substring(end);
                handleInputUpdate(() => newVal);
                requestAnimationFrame(() => {
                    input.setSelectionRange(start, start);
                });
            }
        } else {
            // Delete last char
            handleInputUpdate((val) => val.slice(0, -1));
        }
    };

    const handleClear = () => {
        handleInputUpdate(() => '');
        const input = activeInputRef.current;
        if (input && !input.type.includes('number')) {
            input.focus();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        activeInputRef.current = null;
    };

    return (
        <div
            className="flex h-screen w-screen overflow-hidden bg-slate-50"
            onFocusCapture={handleFocusCapture}
        >
            {/* Main Content Area - Shrinks when keyboard opens */}
            <div className={`
                transition-all duration-300 ease-in-out h-full overflow-hidden
                ${isOpen ? 'w-[calc(100vw-350px)] md:w-[calc(100vw-600px)]' : 'w-full'}
            `}>
                {children}
            </div>

            {/* Keyboard Panel - Slides in from right */}
            <div className={`
                fixed right-0 top-0 h-full bg-white z-[9999] shadow-2xl
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                w-[350px] md:w-[600px]
            `}>
                <VirtualKeyboard
                    isOpen={true} // Always "open" inside the panel if panel is visible
                    type={keyboardType}
                    language={language}
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onClear={handleClear}
                    onEnter={handleClose}
                    onClose={handleClose}
                />
            </div>

            {/* Overlay for small screens if needed, but we are designing for Kiosk (large screen) */}
        </div>
    );
};

export default KioskKeyboardWrapper;
