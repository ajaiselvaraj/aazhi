/**
 * KioskKeyboardWrapper
 *
 * Detects which input is focused and drives the VirtualKeyboard panel.
 *
 * For KioskInput (uncontrolled consumer / PIN / text fields):
 *   → Calls the imperative handle (injectKey / injectBackspace / injectClear)
 *   → KioskInput owns all formatting and cursor restoration internally.
 *
 * For any other plain <input> (legacy, non-KioskInput):
 *   → Falls back to native DOM mutation + dispatches a synthetic 'input' event
 *     so React's onChange fires normally.
 */
import React, { useState, useRef } from 'react';
import VirtualKeyboard, { KeyboardType } from './kiosk/VirtualKeyboard';
import { Language } from '../types';
import type { KioskInputHandle } from './kiosk/KioskInput';

interface Props {
    children: React.ReactNode;
    language: Language;
}

const KioskKeyboardWrapper: React.FC<Props> = ({ children, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('TEXT');

    /** The raw DOM input that is currently focused */
    const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    /** The KioskInputHandle for the focused input (null for non-KioskInput) */
    const activeKioskHandleRef = useRef<KioskInputHandle | null>(null);

    // ── Focus capture ─────────────────────────────────────────────────────────
    const handleFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;

        const input = target as HTMLInputElement;
        if (input.readOnly || input.disabled) return;

        const inputMode = input.getAttribute('inputmode');
        let kType: KeyboardType =
            input.type === 'number' ||
            input.type === 'tel' ||
            inputMode === 'numeric' ||
            inputMode === 'decimal'
                ? 'NUMERIC'
                : 'TEXT';

        activeInputRef.current = input;

        // Check whether the focused input belongs to a KioskInput component
        // KioskInput stores its handle on the element via a data attribute injected
        // by the ref-forwarding chain.  We look it up via the closest ancestor that
        // carries the handle.
        // Instead, traverse upward looking for a React-owned handle stored in a
        // well-known data attribute.
        const kioskHandle: KioskInputHandle | null =
            (input as any).__kioskHandle ?? null;
        activeKioskHandleRef.current = kioskHandle;

        setKeyboardType(kType);
        setIsOpen(true);
    };

    // ── Fallback: plain DOM mutation for non-KioskInput elements ─────────────
    const mutateNativeDom = (
        input: HTMLInputElement | HTMLTextAreaElement,
        newValue: string,
        newCursor: number,
    ) => {
        const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(input),
            'value',
        )?.set;
        setter?.call(input, newValue);
        if (document.activeElement === input) {
            input.setSelectionRange(newCursor, newCursor);
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    // ── Key press ─────────────────────────────────────────────────────────────
    const handleKeyPress = (key: string) => {
        const handle = activeKioskHandleRef.current;
        if (handle) {
            handle.injectKey(key);
            return;
        }
        // Fallback for non-KioskInput
        const input = activeInputRef.current;
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const newVal = input.value.slice(0, start) + key + input.value.slice(end);
        mutateNativeDom(input, newVal, start + key.length);
    };

    // ── Backspace ─────────────────────────────────────────────────────────────
    const handleDelete = () => {
        const handle = activeKioskHandleRef.current;
        if (handle) {
            handle.injectBackspace();
            return;
        }
        const input = activeInputRef.current;
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        let newVal: string;
        let newCursor: number;
        if (start !== end) {
            newVal = input.value.slice(0, start) + input.value.slice(end);
            newCursor = start;
        } else if (start > 0) {
            newVal = input.value.slice(0, start - 1) + input.value.slice(start);
            newCursor = start - 1;
        } else {
            return;
        }
        mutateNativeDom(input, newVal, newCursor);
    };

    // ── Clear ─────────────────────────────────────────────────────────────────
    const handleClear = () => {
        const handle = activeKioskHandleRef.current;
        if (handle) {
            handle.injectClear();
            return;
        }
        const input = activeInputRef.current;
        if (!input) return;
        mutateNativeDom(input, '', 0);
    };

    // ── Close ─────────────────────────────────────────────────────────────────
    const handleClose = () => {
        activeInputRef.current?.blur();
        setIsOpen(false);
        activeInputRef.current = null;
        activeKioskHandleRef.current = null;
    };

    return (
        <div
            className="flex h-screen w-screen overflow-hidden bg-slate-50"
            onFocusCapture={handleFocusCapture}
        >
            {/* Main content area */}
            <div
                className={`
                    transition-all duration-300 ease-in-out h-full overflow-hidden
                    ${isOpen ? 'w-[calc(100vw-350px)] md:w-[calc(100vw-600px)]' : 'w-full'}
                `}
            >
                {children}
            </div>

            {/* Virtual keyboard panel */}
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