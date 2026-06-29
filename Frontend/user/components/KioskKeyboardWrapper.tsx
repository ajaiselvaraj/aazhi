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
import React, { useState, useRef, useEffect, useCallback } from 'react';
import VirtualKeyboard, { KeyboardType } from './kiosk/VirtualKeyboard';
import { Language } from '../types';
import type { KioskInputHandle } from './kiosk/KioskInput';
import { useOrientation } from '../contexts/OrientationContext';

interface Props {
    children: React.ReactNode;
    language: Language;
}

const KioskKeyboardWrapper: React.FC<Props> = ({ children, language }) => {
    const { isVertical } = useOrientation();
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

        // ── Scroll focused input into view after keyboard animation ──────────
        // In vertical (portrait) mode the viewport shrinks by 420px when the
        // keyboard slides up. Wait for the 300ms CSS transition to complete, then
        // ask the browser to scroll the focused element into the visible area so
        // it is never hidden behind the keyboard panel or pushed out of view.
        if (isVertical) {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 350);
        }
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
        const input = activeInputRef.current;
        if (!input) return;

        // Ensure we respect maxLength before inserting characters via virtual keyboard
        if (input.maxLength && input.maxLength > 0) {
            // Check if we're going to exceed maxLength
            // We must allow replacing text if there's a selection
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            const isReplacing = start !== end;
            
            if (!isReplacing && input.value.length >= input.maxLength) {
                // Ignore additional key presses after limit is reached
                return;
            }
        }

        const handle = activeKioskHandleRef.current;
        if (handle) {
            handle.injectKey(key);
            return;
        }
        
        // Fallback for non-KioskInput
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

    // ── Enter ─────────────────────────────────────────────────────────────────
    const handleEnter = useCallback(() => {
        const input = activeInputRef.current;
        if (input) {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(event);
            
            if (input.form) {
                // Dispatch native submit event
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                input.form.dispatchEvent(submitEvent);
            }
        }
        handleClose();
    }, []);

    // ── Close ─────────────────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        activeInputRef.current?.blur();
        setIsOpen(false);
        activeInputRef.current = null;
        activeKioskHandleRef.current = null;
    }, []);

    // ── Outside Click Detection ───────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            // Ignore clicks on inputs
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            // Ignore clicks inside the keyboard
            if (target.closest('[data-keyboard-container="true"]')) return;
            
            handleClose();
        };

        // Use capture phase to catch clicks before they might be stopped
        document.addEventListener('mousedown', handleOutsideClick, true);
        document.addEventListener('touchstart', handleOutsideClick, true);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick, true);
            document.removeEventListener('touchstart', handleOutsideClick, true);
        };
    }, [isOpen, handleClose]);

    // ── Auto-focus first input when new screen renders ─────────────────────────
    useEffect(() => {
        const focusFirstInput = () => {
            // Only auto-focus if no input is currently focused
            const active = document.activeElement as HTMLElement | null;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                return;
            }

            // Find all inputs excluding disabled, readonly, hidden
            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])');
            for (let i = 0; i < inputs.length; i++) {
                const el = inputs[i] as HTMLElement;
                // Check if it's part of the keyboard
                if (el.closest('[data-keyboard-container="true"]')) continue;
                // Check if visible (using standard offsetWidth/Height check)
                if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                    el.focus();
                    break;
                }
            }
        };

        // Try once on mount
        focusFirstInput();

        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node as HTMLElement;
                            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.querySelector('input, textarea')) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }

            if (shouldCheck) {
                // Short delay to let React finish layout calculation
                setTimeout(focusFirstInput, 50);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    return (
        <div
            className="relative h-screen w-screen overflow-hidden bg-slate-50"
            onFocusCapture={handleFocusCapture}
        >
            {/* Main content area — shrinks vertically (portrait) or horizontally (landscape) when keyboard is open */}
            <div
                className="overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out"
                style={
                    isVertical
                        ? {
                            width: '100%',
                            height: isOpen ? 'calc(100vh - 450px)' : '100vh',
                          }
                        : {
                            height: '100vh',
                            width: isOpen ? 'calc(100vw - 350px)' : '100vw',
                          }
                }
            >
                {children}
            </div>

            {/* Virtual keyboard panel */}
            <div
                data-keyboard-container="true"
                className={`
                    fixed z-[9999] bg-white shadow-2xl
                    transition-transform duration-300 ease-in-out
                    ${isVertical 
                        ? `bottom-0 left-0 w-full h-[450px] ${isOpen ? 'translate-y-0' : 'translate-y-full'}` 
                        : `right-0 top-0 h-full w-[350px] md:w-[600px] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
                    }
                `}
            >
                <VirtualKeyboard
                    isOpen={true}
                    type={keyboardType}
                    language={language}
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onClear={handleClear}
                    onEnter={handleEnter}
                    onClose={handleClose}
                />
            </div>
        </div>
    );
};

export default KioskKeyboardWrapper;