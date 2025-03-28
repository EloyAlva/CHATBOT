export class Patient {
    constructor(data) {
        this.validateData(data);
        
        this.dni = data.Doc_Identidad;
        this.nombres = data.Nombres;
        this.apellidoPaterno = data.APaterno;
        this.apellidoMaterno = data.AMaterno;
        this.edad = data.Edad;
        this.historiaClinica = data.HClinica;
    }

    validateData(data) {
        const requiredFields = ['Doc_Identidad', 'Nombres'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }

    get nombreCompleto() {
        return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno}`.trim();
    }

    toJSON() {
        return {
            dni: this.dni,
            nombres: this.nombres,
            apellidoPaterno: this.apellidoPaterno,
            apellidoMaterno: this.apellidoMaterno,
            edad: this.edad,
            historiaClinica: this.historiaClinica
        };
    }

    static fromDatabase(dbData) {
        return new Patient({
            Doc_Identidad: dbData.Doc_Identidad,
            Nombres: dbData.Nombres,
            APaterno: dbData.APaterno,
            AMaterno: dbData.AMaterno,
            Edad: dbData.Edad,
            HClinica: dbData.HClinica
        });
    }
}