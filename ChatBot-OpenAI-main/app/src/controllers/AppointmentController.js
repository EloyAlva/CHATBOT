const Appointment = require('../models/Appointment');
const ErrorHandler = require('../utils/ErrorHandler');
const DateFormatter = require('../utils/DateFormatter');

class AppointmentController {
    constructor(appointmentService) {
        this.appointmentService = appointmentService;
    }

    async getAvailableAppointments(especialidadId) {
        try {
            const appointments = await this.appointmentService.getAvailableAppointments(especialidadId);
            return appointments.map(apt => new Appointment(apt));
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'obtener citas disponibles');
        }
    }

    async registerAppointment(appointmentData) {
        try {
            appointmentData.fechaCita = DateFormatter.formatToSQL(new Date(appointmentData.fechaCita));
            const result = await this.appointmentService.registerAppointment(appointmentData);
            return result;
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'registrar cita');
        }
    }
}

module.exports = AppointmentController;