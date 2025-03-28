export class DateFormatter {
    static formatToSpanish(date) {
        return new Date(date).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatToSQL(date) {
        return date.toISOString().split('T')[0];
    }

    static formatTime(time) {
        if (!time) return '';
        return time.toString().padStart(5, '0');
    }

    static isValidDate(date) {
        return date instanceof Date && !isNaN(date);
    }

    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}