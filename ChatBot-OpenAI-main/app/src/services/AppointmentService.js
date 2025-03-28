import { ErrorHandler } from '../utils/ErrorHandler.js';
import { Appointment } from '../models/Appointment.js';

export class AppointmentService {
    constructor(dbService) {
        this.dbService = dbService;
    }

    async getAvailableAppointments(especialidadId) {
        try {
            if (!especialidadId) {
                throw new Error('ID de especialidad no válido');
            }

            const baseUrl = this.dbService.config.baseUrl || 'http://localhost:3000';
            console.log(`Fetching appointments from: ${baseUrl}/api/appointments/${especialidadId}`);

            const response = await fetch(`${baseUrl}/api/appointments/${especialidadId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            // Check if response is HTML instead of JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.error('Received HTML instead of JSON');
                throw new Error('Error de servidor: respuesta incorrecta');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log('Appointments data received:', data);

            if (data.status === 'success' && Array.isArray(data.data)) {
                return data.data.map(appointment => new Appointment({
                    IdProgramacion: appointment.IdProgramacion,
                    FechaCita: appointment.FechaCita,
                    IdMedico: appointment.IdMedico,
                    Medico: appointment.Medico,
                    CuposDisponibles: appointment.CuposDisponibles,
                    PrimeraHoraDisponible: appointment.PrimeraHoraDisponible
                }));
            } else {
                throw new Error(data.message || 'Error al recuperar citas');
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw new Error(`Error al buscar citas disponibles: ${error.message}`);
        }
    }

    async registerAppointment(appointmentData) {
        try {
            // Log the raw appointment data
            console.log('Raw appointment data:', appointmentData);

            // Log the stringified data
            const jsonData = JSON.stringify(appointmentData);
            console.log('Stringified appointment data:', jsonData);

            const response = await fetch(`${this.dbService.config.baseUrl}/api/appointments/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: jsonData
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorData
                });
                throw new Error(`Error en el servidor: ${response.status}`);
            }

            const result = await response.json();
            console.log('Server response:', result);
            return result;
        } catch (error) {
            console.error('Registration error details:', error);
            ErrorHandler.handleError('registerAppointment', error);
            throw new Error(`Error al registrar cita: ${error.message}`);
        }
    }
}