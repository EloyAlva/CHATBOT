import { DateFormatter } from '../utils/DateFormatter.js';

export class Appointment {
    constructor(data) {
        console.log('Creating appointment with data:', data);

        // Map database fields to class properties with validation
        this.idProgramacion = data.IdProgramacion;
        this.fechaCita = this.parseDate(data.FechaCita);
        this.idMedico = data.IdMedico;
        this.nombreMedico = data.Medico;
        this.primeraHoraDisponible = data.PrimeraHoraDisponible;
        this.cuposDisponibles = data.CuposDisponibles;
        this.especialidadId = data.especialidadId;
        this.especialidad = data.especialidad;

        // Validate the object
        this.validate();
    }

    validate() {
        if (!this.idProgramacion) throw new Error('Missing IdProgramacion');
        if (!this.fechaCita) throw new Error('Missing or invalid FechaCita');
        if (!this.idMedico) throw new Error('Missing IdMedico');
        if (!this.nombreMedico) throw new Error('Missing Medico name');
        if (!this.primeraHoraDisponible) throw new Error('Missing PrimeraHoraDisponible');
    }

    parseDate(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            return date;
        } catch (error) {
            console.error('Error parsing date:', dateString, error);
            return null;
        }
    }

    isAvailable() {
        return this.cuposDisponibles > 0;
    }

    getFormattedDate() {
        return this.fechaCita.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getFormattedTime() {
        return this.primeraHoraDisponible;
    }

    getMedicoName() {
        return this.nombreMedico;
    }

    toJSON() {
        return {
            idProgramacion: this.idProgramacion,
            fechaCita: this.fechaCita?.toISOString(),
            idMedico: this.idMedico,
            nombreMedico: this.nombreMedico,
            cuposDisponibles: this.cuposDisponibles,
            primeraHoraDisponible: this.primeraHoraDisponible,
            especialidadId: this.especialidadId,
            especialidad: this.especialidad
        };
    }

    toDatabaseFormat() {
        return {
            IdProgramacion: this.idProgramacion,
            FechaCita: DateFormatter.formatToSQL(this.fechaCita),
            CodMedico: this.idMedico,
            NomMedico: this.nombreMedico,
            HoraCita: this.primeraHoraDisponible,
            IdSubEspecialidad: this.especialidadId,
            Especialidad: this.especialidad
        };
    }

    static fromDatabase(dbData) {
        console.log('Converting from database:', dbData);
        return new Appointment({
            IdProgramacion: dbData.IdProgramacion,
            FechaCita: dbData.FechaCita,
            IdMedico: dbData.IdMedico,
            Medico: dbData.Medico,
            CuposDisponibles: dbData.CuposDisponibles,
            PrimeraHoraDisponible: dbData.PrimeraHoraDisponible,
            especialidadId: dbData.IdSubEspecialidad,
            especialidad: dbData.Especialidad
        });
    }
}