import { Patient } from '../models/Patient.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class PatientController {
    constructor(dbService) {
        this.dbService = dbService;
    }

    async getPatientByDNI(dni) {
        try {
            await this.validateDNI(dni);
            
            const baseUrl = this.dbService.config.baseUrl || 'http://localhost:3000';
            console.log('Fetching patient data from:', `${baseUrl}/api/patient/${dni}`);

            const response = await fetch(`${baseUrl}/api/patient/${dni}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Patient data received:', data);

            return Patient.fromDatabase(data);
        } catch (error) {
            ErrorHandler.handleError('getPatientByDNI', error);
            throw new Error(`Error al buscar paciente: ${error.message}`);
        }
    }

    async validateDNI(dni) {
        const dniRegex = /^\d{8}$/;
        if (!dniRegex.test(dni)) {
            throw new Error('El DNI debe tener 8 dígitos numéricos');
        }
        return true;
    }
}