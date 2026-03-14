/**
 * Error Translation Service
 * Provides translated error messages based on language preference
 * Ensures all errors are displayed in user's preferred language
 */

import i18n from '../i18n';

export interface TranslatedError {
    message: string;
    key: string;
    originalError?: string;
}

/**
 * Error Code Mapping - Maps error scenarios to translation keys
 */
const ERROR_CODE_MAP: Record<string, string> = {
    'INVALID_CONSUMER_NUMBER': 'err_invalidConsumer',
    'BILL_FETCH_FAILED': 'err_billFetch',
    'STORAGE_FAILED': 'err_storage',
    'NETWORK_ERROR': 'err_network',
    'PAYMENT_FAILED': 'err_payment',
    'PARSING_ERROR': 'err_parsing',
    'MANDATORY_FIELD': 'err_mandatory',
    'VALIDATION_ERROR': 'err_validation',
    'GENERIC_ERROR': 'err_generic',
    'EMPTY_FIELD': 'err_emptyField',
};

/**
 * Get translated error message by error code
 * @param errorCode - The error code (e.g., 'INVALID_CONSUMER_NUMBER')
 * @param fallbackMessage - Fallback message if translation not found
 * @returns Translated error message
 */
export const getTranslatedError = (
    errorCode: string,
    fallbackMessage?: string
): TranslatedError => {
    const translationKey = ERROR_CODE_MAP[errorCode] || 'err_generic';
    const message = i18n.t(translationKey, { defaultValue: fallbackMessage || i18n.t('err_generic') });

    return {
        message,
        key: translationKey,
        originalError: errorCode,
    };
};

/**
 * Get translated error by key directly
 * @param key - Translation key (e.g., 'err_invalidConsumer')
 * @param fallbackMessage - Fallback message
 * @returns Translated error message
 */
export const getErrorByKey = (key: string, fallbackMessage?: string): string => {
    return i18n.t(key, { defaultValue: fallbackMessage || i18n.t('err_generic') });
};

/**
 * Format error response with translation
 * @param errorCode - Error code
 * @param fallbackMessage - Fallback message
 * @returns Formatted error response
 */
export const formatErrorResponse = (
    errorCode: string,
    fallbackMessage?: string
) => {
    const error = getTranslatedError(errorCode, fallbackMessage);
    return {
        success: false,
        error: error.message,
        errorCode: error.originalError,
    };
};

/**
 * Translate multiple error messages
 * @param errorCodes - Array of error codes
 * @returns Array of translated errors
 */
export const translateErrors = (errorCodes: string[]): string[] => {
    return errorCodes.map((code) => getTranslatedError(code).message);
};

export default {
    getTranslatedError,
    getErrorByKey,
    formatErrorResponse,
    translateErrors,
};
