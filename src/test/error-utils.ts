/**
 * Error type guard utility functions for safe error handling in tests
 * Provides type-safe error message extraction and error type checking
 */

/**
 * Type guard to check if an unknown error is an Error instance
 * @param error - The caught error of unknown type
 * @returns true if error is an Error instance, false otherwise
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Safely extracts error message from unknown error types
 * @param error - The caught error of unknown type
 * @returns A string representation of the error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as any).message);
    }
    return 'Unknown error occurred';
}

/**
 * Type guard for Error-like objects that have a message property
 * @param error - The caught error of unknown type
 * @returns true if error has a message property, false otherwise
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
    return error !== null && 
           error !== undefined && 
           typeof error === 'object' && 
           'message' in error && 
           typeof (error as any).message === 'string';
}

/**
 * Safely checks if an error message includes a specific substring
 * @param error - The caught error of unknown type
 * @param substring - The substring to search for
 * @returns true if the error message includes the substring, false otherwise
 */
export function errorMessageIncludes(error: unknown, substring: string): boolean {
    const message = getErrorMessage(error);
    return message.includes(substring);
}