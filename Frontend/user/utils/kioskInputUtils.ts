// ─────────────────────────────────────────────────────────────────────────────
// kioskInputUtils.ts  –  Production-grade formatter + cursor engine
// Used by BOTH the virtual keyboard wrapper AND the physical-keyboard input.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip non-digits, cap at maxDigits, then reformat.
 * Consumer: "XXXX XXXX XXXX"  (12 digits)
 * Pin:      raw digits only    (6 digits max)
 */
export const kioskFormatters = {
    consumer: (raw: string): string => {
        const digits = raw.replace(/\D/g, '').slice(0, 12);
        // Insert space after every 4th digit, but NOT after the last group
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    },
    pin: (raw: string): string => raw.replace(/\D/g, '').slice(0, 6),
    text: (raw: string): string => raw,
};

/**
 * Core engine – accepts the RAW (unformatted) digit string + the raw digit
 * cursor index (how many raw digits are to the left of the cursor).
 *
 * Returns:
 *   newValue    – formatted display string
 *   newCursor   – cursor position in the formatted string
 */
function applyRawDigitOperation(
    rawDigits: string,
    rawCursorAfter: number,
    formatType: 'consumer' | 'pin' | 'text',
): { newValue: string; newCursor: number } {
    const newValue = kioskFormatters[formatType](rawDigits);

    if (formatType === 'text') {
        return { newValue, newCursor: rawCursorAfter };
    }

    // Walk the formatted string, counting digits until we've consumed
    // rawCursorAfter digits – that gives us our display cursor position.
    let digitsFound = 0;
    let displayCursor = 0;

    for (let i = 0; i < newValue.length; i++) {
        if (/\d/.test(newValue[i])) {
            digitsFound++;
        }
        if (digitsFound === rawCursorAfter) {
            displayCursor = i + 1;
            // Advance past an immediately-following space so the next digit
            // goes AFTER the space, not before it.
            if (displayCursor < newValue.length && newValue[displayCursor] === ' ') {
                displayCursor++;
            }
            break;
        }
    }

    // If cursor is at position 0 or rawCursorAfter was 0, stay at 0.
    if (rawCursorAfter === 0) displayCursor = 0;

    return { newValue, newCursor: Math.min(displayCursor, newValue.length) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API used by KioskKeyboardWrapper (virtual keyboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a single character insertion at the current formatted display cursor.
 */
export function applyKeyPress(
    displayValue: string,
    displayStart: number,
    displayEnd: number,
    key: string,
    formatType: 'consumer' | 'pin' | 'text',
): { newValue: string; newCursor: number } {
    if (formatType === 'text') {
        const v = displayValue.slice(0, displayStart) + key + displayValue.slice(displayEnd);
        return { newValue: v, newCursor: displayStart + key.length };
    }

    // Work entirely in raw-digit space
    const rawBefore = displayValue.replace(/\D/g, '');
    const rawCursorBefore = displayValue.slice(0, displayStart).replace(/\D/g, '').length;
    const rawCursorEnd   = displayValue.slice(0, displayEnd).replace(/\D/g, '').length;

    // Only accept digit keys for formatted fields
    if (!/^\d$/.test(key)) return { newValue: displayValue, newCursor: displayStart };

    const maxDigits = formatType === 'consumer' ? 12 : 6;
    if (rawBefore.length >= maxDigits && rawCursorBefore === rawCursorEnd) {
        // Already full and no selection to replace – reject
        return { newValue: displayValue, newCursor: displayStart };
    }

    const rawAfter =
        rawBefore.slice(0, rawCursorBefore) +
        key +
        rawBefore.slice(rawCursorEnd);

    const rawCursorAfter = rawCursorBefore + 1;

    return applyRawDigitOperation(rawAfter.slice(0, maxDigits), rawCursorAfter, formatType);
}

/**
 * Apply a backspace (delete-left) at the current formatted display cursor.
 */
export function applyBackspace(
    displayValue: string,
    displayStart: number,
    displayEnd: number,
    formatType: 'consumer' | 'pin' | 'text',
): { newValue: string; newCursor: number } {
    if (formatType === 'text') {
        if (displayStart === displayEnd && displayStart > 0) {
            const v = displayValue.slice(0, displayStart - 1) + displayValue.slice(displayEnd);
            return { newValue: v, newCursor: displayStart - 1 };
        }
        const v = displayValue.slice(0, displayStart) + displayValue.slice(displayEnd);
        return { newValue: v, newCursor: displayStart };
    }

    const rawBefore = displayValue.replace(/\D/g, '');
    const rawCursorStart = displayValue.slice(0, displayStart).replace(/\D/g, '').length;
    const rawCursorEnd   = displayValue.slice(0, displayEnd).replace(/\D/g, '').length;

    const maxDigits = formatType === 'consumer' ? 12 : 6;

    if (rawCursorStart === rawCursorEnd) {
        // No selection: delete the digit immediately to the left
        if (rawCursorStart === 0) return { newValue: displayValue, newCursor: displayStart };
        const rawAfter = rawBefore.slice(0, rawCursorStart - 1) + rawBefore.slice(rawCursorStart);
        return applyRawDigitOperation(rawAfter, rawCursorStart - 1, formatType);
    } else {
        // Delete selected range of digits
        const rawAfter = rawBefore.slice(0, rawCursorStart) + rawBefore.slice(rawCursorEnd);
        return applyRawDigitOperation(rawAfter.slice(0, maxDigits), rawCursorStart, formatType);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API used by KioskInput (physical keyboard onChange handler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called from the React onChange event with the browser-provided next value.
 * The browser has already inserted/deleted the character; we just reformat it
 * and compute where the cursor should sit in the reformatted string.
 *
 * @param browserValue   The new value the browser produced (may be unformatted)
 * @param browserCursor  selectionStart after the browser mutated the value
 */
export function applyPhysicalKeyboard(
    browserValue: string,
    browserCursor: number,
    formatType: 'consumer' | 'pin' | 'text',
): { newValue: string; newCursor: number } {
    if (formatType === 'text') {
        return { newValue: browserValue, newCursor: browserCursor };
    }

    // Count how many raw digits the browser put before the cursor
    const rawDigitsBeforeCursor = browserValue.slice(0, browserCursor).replace(/\D/g, '').length;
    const rawDigits = browserValue.replace(/\D/g, '');
    const maxDigits = formatType === 'consumer' ? 12 : 6;

    return applyRawDigitOperation(
        rawDigits.slice(0, maxDigits),
        Math.min(rawDigitsBeforeCursor, maxDigits),
        formatType,
    );
}
