export class ErrorHandler {
    static handleError(operation, error) {
        console.error(`Error in ${operation}:`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    static handleDatabaseError(operation, error) {
        console.error(`Database error in ${operation}:`, {
            message: error.message,
            code: error.code,
            state: error.state,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    static handleAPIError(operation, error) {
        console.error(`API error in ${operation}:`, {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    static formatErrorMessage(error) {
        return {
            message: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
            details: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        };
    }

    static isNetworkError(error) {
        return error.message === 'Failed to fetch' || !window.navigator.onLine;
    }
}