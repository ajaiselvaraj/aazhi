/**
 * useErrorTranslation Hook
 * Provides easy access to translated error messages
 * Automatically updates when language changes
 */

import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslatedError, getErrorByKey, TranslatedError } from '../services/errorTranslationService';

export interface UseErrorTranslationReturn {
    translateError: (errorCode: string) => string;
    formatErrorResponse: (errorCode: string, fallback?: string) => { success: false; error: string };
    translateErrorKey: (key: string) => string;
}

/**
 * Hook to translate error codes and messages
 * Usage:
 *   const { translateError, formatErrorResponse } = useErrorTranslation();
 *   const errorMsg = translateError('INVALID_CONSUMER_NUMBER');
 *   const response = formatErrorResponse('BILL_FETCH_FAILED');
 */
export const useErrorTranslation = (): UseErrorTranslationReturn => {
    const { t } = useLanguage();

    const translateError = useCallback(
        (errorCode: string): string => {
            const error = getTranslatedError(errorCode);
            return error.message;
        },
        [t]
    );

    const formatErrorResponse = useCallback(
        (errorCode: string, fallback?: string) => ({
            success: false,
            error: translateError(errorCode) || fallback || t('err_generic'),
        }),
        [translateError]
    );

    const translateErrorKey = useCallback(
        (key: string): string => {
            return t(key) || key;
        },
        [t]
    );

    return {
        translateError,
        formatErrorResponse,
        translateErrorKey,
    };
};

export default useErrorTranslation;
