/**
 * KioskInput — Production-grade kiosk input component.
 *
 * WHY UNCONTROLLED FOR 'consumer' FORMAT:
 * React's controlled-input mechanism synchronises the DOM `value` during every
 * commit phase. When React writes the formatted string it simultaneously resets
 * `selectionStart/End` to the end of the string (or some other heuristic) on
 * many Android WebView / Chromium builds.  After months of fight-and-fix cycles
 * (requestAnimationFrame, useLayoutEffect, liveCursorRef, onTouchStart
 * prevention, …) the only 100% reliable solution is to take React *out* of the
 * cursor-management loop entirely for the consumer-number field:
 *
 *   • The DOM `<input>` is UNCONTROLLED (no `value` prop, just `defaultValue`).
 *   • Formatting and cursor restoration happen imperatively via
 *     `inputRef.current.value = …` and `inputRef.current.setSelectionRange(…)`.
 *   • We notify the parent via `onChangeValue` AFTER the DOM has stabilised.
 *   • React never touches the input's value or cursor again.
 *
 * The PIN field stays controlled because it has no auto-spacing and its
 * 6-character maximum means React's cursor heuristic never causes a visible
 * problem.
 */
import React, { useRef, useEffect, useImperativeHandle, forwardRef, ChangeEvent } from 'react';

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a raw digit string (≤12 chars) into "XXXX XXXX XXXX".
 * Extra non-digit characters are stripped; input is capped at 12 digits.
 */
function formatConsumer(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Given the formatted string that the browser just produced (after the user
 * typed/deleted a character) and the browser's reported cursor position,
 * return the correctly formatted string and the exact cursor position that
 * should be restored in it.
 *
 * Strategy (digit-anchored):
 * 1. Count how many *digits* sit to the left of the browser cursor in the raw
 *    browser value.
 * 2. Reformat from scratch (always correct).
 * 3. Walk the new formatted string until we've passed the same number of
 *    digits — that index is the new cursor.
 */
function applyConsumer(
    browserValue: string,
    browserCursor: number,
): { newValue: string; newCursor: number } {
    // Count digits before cursor in the raw browser value
    const rawBefore = browserValue.slice(0, browserCursor);
    const digitsBeforeCursor = rawBefore.replace(/\D/g, '').length;

    const newValue = formatConsumer(browserValue);

    // Walk the formatted string, counting digits until we reach digitsBeforeCursor
    let count = 0;
    let newCursor = newValue.length; // fallback: end of string
    for (let i = 0; i < newValue.length; i++) {
        if (count === digitsBeforeCursor) {
            newCursor = i;
            break;
        }
        if (/\d/.test(newValue[i])) count++;
    }
    // If we hit digitsBeforeCursor exactly at the end, newCursor stays at length

    return { newValue, newCursor };
}

/** Format & cap PIN: digits only, max 6 */
function applyPin(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, 6);
}

// ─── Public handle (for imperative key injection from KioskKeyboardWrapper) ───
export interface KioskInputHandle {
    /** Called by KioskKeyboardWrapper instead of native DOM mutation */
    injectKey(key: string): void;
    injectBackspace(): void;
    injectClear(): void;
    getNativeInput(): HTMLInputElement | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface KioskInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'> {
    formatType?: 'consumer' | 'pin' | 'text';
    /** Current value (parent-controlled logical value, digits only for consumer/pin) */
    value: string;
    onChangeValue: (val: string) => void;
    icon?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
const KioskInput = forwardRef<KioskInputHandle, KioskInputProps>(
    ({ formatType = 'text', value, onChangeValue, icon, className, ...props }, ref) => {
        const inputRef = useRef<HTMLInputElement>(null);

        // ── Expose imperative handle to KioskKeyboardWrapper ────────────────
        useImperativeHandle(ref, () => ({
            injectKey(key: string) {
                const el = inputRef.current;
                if (!el) return;
                const start = el.selectionStart ?? el.value.length;
                const end = el.selectionEnd ?? el.value.length;
                const rawNext = el.value.slice(0, start) + key + el.value.slice(end);
                const nextCursor = start + key.length;
                applyAndNotify(rawNext, nextCursor);
            },
            injectBackspace() {
                const el = inputRef.current;
                if (!el) return;
                const start = el.selectionStart ?? el.value.length;
                const end = el.selectionEnd ?? el.value.length;
                let rawNext: string;
                let nextCursor: number;
                if (start !== end) {
                    rawNext = el.value.slice(0, start) + el.value.slice(end);
                    nextCursor = start;
                } else if (start > 0) {
                    rawNext = el.value.slice(0, start - 1) + el.value.slice(start);
                    nextCursor = start - 1;
                } else {
                    return;
                }
                applyAndNotify(rawNext, nextCursor);
            },
            injectClear() {
                applyAndNotify('', 0);
            },
            getNativeInput() {
                return inputRef.current;
            },
        }));

        /**
         * Central formatting + cursor restoration + parent notification.
         * rawInput  – the string currently in the DOM (before formatting)
         * rawCursor – the cursor position inside rawInput
         */
        function applyAndNotify(rawInput: string, rawCursor: number) {
            const el = inputRef.current;
            if (!el) return;

            if (formatType === 'consumer') {
                const { newValue, newCursor } = applyConsumer(rawInput, rawCursor);
                // Write directly to DOM – React does NOT own this value
                el.value = newValue;
                el.setSelectionRange(newCursor, newCursor);
                // Notify parent (digits only, for clean API surface)
                onChangeValue(newValue.replace(/\D/g, ''));
            } else if (formatType === 'pin') {
                const newValue = applyPin(rawInput);
                el.value = newValue;
                const pos = Math.min(rawCursor, newValue.length);
                el.setSelectionRange(pos, pos);
                onChangeValue(newValue);
            } else {
                el.value = rawInput;
                el.setSelectionRange(rawCursor, rawCursor);
                onChangeValue(rawInput);
            }
        }

        // ── Attach handle to native DOM element for wrapper lookup ────────────
        // KioskKeyboardWrapper reads `input.__kioskHandle` to call injectKey etc.
        useEffect(() => {
            const el = inputRef.current;
            if (!el) return;
            // Store handle reference imperatively on the DOM node (non-React)
            (el as any).__kioskHandle = {
                injectKey(key: string) {
                    const start = el.selectionStart ?? el.value.length;
                    const end = el.selectionEnd ?? el.value.length;
                    applyAndNotify(el.value.slice(0, start) + key + el.value.slice(end), start + key.length);
                },
                injectBackspace() {
                    const start = el.selectionStart ?? el.value.length;
                    const end = el.selectionEnd ?? el.value.length;
                    if (start !== end) {
                        applyAndNotify(el.value.slice(0, start) + el.value.slice(end), start);
                    } else if (start > 0) {
                        applyAndNotify(el.value.slice(0, start - 1) + el.value.slice(start), start - 1);
                    }
                },
                injectClear() {
                    applyAndNotify('', 0);
                },
                getNativeInput() {
                    return el;
                },
            } satisfies KioskInputHandle;
            return () => { delete (el as any).__kioskHandle; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [formatType]);


        useEffect(() => {
            const el = inputRef.current;
            if (!el) return;
            // Only update if the DOM value diverges from the canonical value,
            // and only when the input is NOT focused (i.e. not being typed into).
            if (document.activeElement === el) return;
            if (formatType === 'consumer') {
                el.value = formatConsumer(value);
            } else {
                el.value = value;
            }
        }, [value, formatType]);

        // ── Physical keyboard handler ─────────────────────────────────────────
        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const el = e.target;
            const browserCursor = el.selectionStart ?? el.value.length;
            applyAndNotify(el.value, browserCursor);
        };

        // ── Compute the initial display value ─────────────────────────────────
        const displayDefault = formatType === 'consumer' ? formatConsumer(value) : value;

        return (
            <div className="relative">
                <input
                    ref={inputRef}
                    // UNCONTROLLED – React will not interfere with value/cursor
                    defaultValue={displayDefault}
                    onChange={handleChange}
                    className={className}
                    data-format={formatType}
                    {...props}
                />
                {icon && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                        {icon}
                    </div>
                )}
            </div>
        );
    },
);

KioskInput.displayName = 'KioskInput';
export default KioskInput;
