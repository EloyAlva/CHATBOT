import { Appointment } from '../models/Appointment.js';

export class ChatController {
    constructor(chatService, appointmentService, patientController) {
        this.chatService = chatService;
        this.appointmentService = appointmentService;
        this.patientController = patientController;
        this.state = {
            isFirstMessage: true,
            waitingForSpecialtyChoice: false,
            waitingForAppointmentChoice: false,
            waitingForConfirmation: false,
            patientData: null,
            specialties: [],
            selectedSpecialty: null,  // Add this line
            selectedAppointment: null
        };
    }

    async initialize() {
        this.state.isFirstMessage = true;
        return 'Por favor, ingresa tu número de DNI:';
    }

    async handleMessage(message) {
        try {
            if (this.state.isFirstMessage) {
                return await this.handleDNI(message);
            }

            if (this.state.waitingForSpecialtyChoice) {
                return await this.handleSpecialtyChoice(message);
            }

            if (this.state.waitingForAppointmentChoice) {
                return await this.handleAppointmentChoice(message);
            }

            if (this.state.waitingForConfirmation) {
                return await this.handleConfirmation(message);
            }

            return await this.handleSymptoms(message);
        } catch (error) {
            console.error('Error in message handling:', error);
            throw new Error('Lo siento, ha ocurrido un error. Por favor, intenta nuevamente.');
        }
    }

    async handleDNI(dni) {
        try {
            const patient = await this.patientController.getPatientByDNI(dni);
            if (!patient) {
                return 'DNI no encontrado. Por favor, verifica el número e intenta nuevamente.';
            }

            this.state.patientData = patient;
            this.state.isFirstMessage = false;

            return `Hola ${patient.nombreCompleto}, ¿en qué puedo ayudarte hoy? Por favor, describe tus síntomas.`;
        } catch (error) {
            console.error('Error handling DNI:', error);
            throw new Error('Error al verificar el DNI. Por favor, intenta nuevamente.');
        }
    }

    async handleSymptoms(symptoms) {
        try {
            // Get AI suggestions
            const aiSuggestions = await this.chatService.analyzeSymptoms(
                this.state.patientName, 
                symptoms
            );

            // Match with database specialties
            const matchedSpecialties = await this.chatService.matchSpecialties(aiSuggestions);

            if (!matchedSpecialties || matchedSpecialties.length === 0) {
                return 'Lo siento, no pude encontrar especialidades que coincidan con tus síntomas. Por favor, intenta describir tus síntomas de otra manera.';
            }

            // Store matched specialties in state
            this.state.specialties = matchedSpecialties;
            this.state.waitingForSpecialtyChoice = true;

            // Format response with matched specialties
            return this.formatSpecialtiesResponse(matchedSpecialties);
        } catch (error) {
            console.error('Error handling symptoms:', error);
            throw new Error('Error al procesar los síntomas');
        }
    }

    formatSpecialtiesResponse(specialties) {
        return `Basado en tus síntomas, te recomiendo las siguientes especialidades:

${specialties.map((specialty, index) => 
    `${index + 1}. ${specialty.Nombre}`
).join('\n')}

Por favor, elige un número del 1 al ${specialties.length} para la especialidad deseada.`;
    }

    async handleSpecialtyChoice(choice) {
        try {
            const choiceNum = parseInt(choice);
            if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > this.state.specialties.length) {
                return `Por favor, elige un número válido del 1 al ${this.state.specialties.length}.`;
            }

            const selectedSpecialty = this.state.specialties[choiceNum - 1];
            console.log('Selected specialty:', selectedSpecialty);

            // Store specialty information
            this.state.selectedSpecialty = selectedSpecialty;
            this.state.selectedSpecialtyId = selectedSpecialty.IdSubEspecialidad;

            // Get appointments
            const appointments = await this.appointmentService.getAvailableAppointments(selectedSpecialty.IdSubEspecialidad);
            console.log('Raw appointments response:', appointments);

            // Check if we have appointments
            if (!appointments || appointments.length === 0) {
                return 'Lo siento, no hay citas disponibles para esta especialidad en este momento.';
            }

            // Add specialty info to appointments and map to Appointment objects
            const appointmentsWithSpecialty = appointments.map(apt => {
                console.log('Processing appointment:', apt);
                // Access the properties directly from the existing Appointment object
                return new Appointment({
                    IdProgramacion: apt.idProgramacion,
                    FechaCita: apt.fechaCita,
                    IdMedico: apt.idMedico,
                    Medico: apt.nombreMedico,
                    PrimeraHoraDisponible: apt.primeraHoraDisponible,
                    CuposDisponibles: apt.cuposDisponibles,
                    especialidadId: selectedSpecialty.IdSubEspecialidad,
                    especialidad: selectedSpecialty.Nombre
                });
            });

            console.log('Appointments with specialty:', appointmentsWithSpecialty);

            // Update state
            this.state.waitingForSpecialtyChoice = false;
            this.state.waitingForAppointmentChoice = true;
            this.state.availableAppointments = appointmentsWithSpecialty;

            // Format and return response
            return this.formatAppointmentsResponse(appointmentsWithSpecialty);
            
        } catch (error) {
            console.error('Error handling specialty choice:', error);
            throw new Error(`Error al procesar la elección de especialidad: ${error.message}`);
        }
    }

    formatAppointmentsResponse(appointments) {
        if (!appointments || appointments.length === 0) {
            return 'Lo siento, no hay citas disponibles para esta especialidad en este momento.';
        }

        console.log('Formatting appointments:', appointments);
        
        const formattedAppointments = appointments.map((apt, index) => {
            const date = apt.getFormattedDate();
            const time = apt.getFormattedTime();
            const doctor = apt.getMedicoName();
            
            console.log(`Appointment ${index + 1}:`, { date, time, doctor });
            
            return `${index + 1}. ${date} - ${time} - Dr. ${doctor}`;
        }).join('\n');

        return `Citas disponibles:\n\n${formattedAppointments}\n\nPor favor, elige un número para agendar tu cita.`;
    }

    async handleAppointmentChoice(choice) {
        try {
            const choiceNum = parseInt(choice);
            if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > this.state.availableAppointments.length) {
                return `Por favor, elige un número válido del 1 al ${this.state.availableAppointments.length}.`;
            }

            const selectedAppointment = this.state.availableAppointments[choiceNum - 1];
            console.log('Selected appointment:', selectedAppointment);

            // Store the complete appointment object
            this.state.selectedAppointment = selectedAppointment;
            this.state.waitingForAppointmentChoice = false;
            this.state.waitingForConfirmation = true;

            return `Has seleccionado la cita para el ${selectedAppointment.getFormattedDate()} a las ${selectedAppointment.getFormattedTime()} con el Dr. ${selectedAppointment.nombreMedico}.\n\n¿Deseas confirmar esta cita? (Responde SI o NO)`;
        } catch (error) {
            console.error('Error handling appointment choice:', error);
            throw new Error('Error al procesar la elección de cita');
        }
    }

    async handleConfirmation(response) {
        try {
            const normalizedResponse = response.toLowerCase().trim();
            
            if (normalizedResponse === 'si' || normalizedResponse === 'sí') {
                // Validate all required data is present
                if (!this.state.selectedAppointment || 
                    !this.state.patientData || 
                    !this.state.selectedSpecialty ||
                    !this.state.selectedSpecialtyId) {
                    console.error('Missing data:', {
                        hasAppointment: !!this.state.selectedAppointment,
                        hasPatientData: !!this.state.patientData,
                        hasSpecialty: !!this.state.selectedSpecialty,
                        specialtyId: this.state.selectedSpecialtyId
                    });
                    throw new Error('Faltan datos necesarios para registrar la cita');
                }

                const appointmentData = {
                    IdProgramacion: this.state.selectedAppointment.idProgramacion,
                    IdSubEspecialidad: this.state.selectedSpecialtyId, // Use stored ID
                    IdMedico: this.state.selectedAppointment.idMedico,
                    FechaCita: this.formatDate(this.state.selectedAppointment.fechaCita),
                    HoraCita: this.state.selectedAppointment.primeraHoraDisponible,
                    DNI: this.state.patientData.dni,
                    Turno: 'MAÑANA'
                };

                console.log('Appointment data to register:', appointmentData);

                // Validate all required fields are present
                const requiredFields = ['IdProgramacion', 'IdSubEspecialidad', 'IdMedico', 'FechaCita', 'HoraCita', 'DNI'];
                const missingFields = requiredFields.filter(field => !appointmentData[field]);
                
                if (missingFields.length > 0) {
                    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
                }

                // Register appointment
                const result = await this.appointmentService.registerAppointment(appointmentData);

                // Store the appointment data before resetting state
                const appointmentDetails = {
                    fecha: appointmentData.FechaCita,
                    hora: appointmentData.HoraCita,
                    medico: this.state.selectedAppointment.nombreMedico
                };

                // Reset state after successful registration
                this.resetState();

                return `¡Cita registrada exitosamente!\n
                    Detalles de tu cita:
                    Fecha: ${appointmentDetails.fecha}
                    Hora: ${appointmentDetails.hora}
                    Médico: ${appointmentDetails.medico}\n
                    ¿Necesitas algo más?`;

            } else if (normalizedResponse === 'no') {
                this.resetState();
                return 'Entiendo. ¿Deseas buscar otra cita? Por favor, describe tus síntomas.';
            } else {
                return 'Por favor, responde "si" o "no" para confirmar la cita.';
            }
        } catch (error) {
            console.error('Error en la confirmación:', error);
            this.resetState();
            throw new Error(`Error al registrar la cita: ${error.message}`);
        }
    }

    // Helper method to format date
    formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            throw new Error('Fecha inválida');
        }
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    }

    resetState() {
        this.state = {
            isFirstMessage: false,
            waitingForSpecialtyChoice: false,
            waitingForAppointmentChoice: false,
            waitingForConfirmation: false,
            patientData: this.state.patientData, // Maintain patient data
            specialties: [],
            selectedSpecialty: null,
            selectedAppointment: null,
            availableAppointments: []
        };
    }
}