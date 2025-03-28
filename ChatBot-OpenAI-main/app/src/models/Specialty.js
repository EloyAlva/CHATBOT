class Specialty {
    constructor(data = {}) {
        this.validateData(data);
        
        this.id = data.id;
        this.nombre = data.nombre;
        this.descripcion = data.Descripcion || data.nombre;
        this.departamentoId = data.IDDPTOESPECILIDAD;
        this.activo = data.Activo !== undefined ? data.Activo : true;
    }

    validateData(data) {
        if (!data.id) {
            throw new Error('Specialty ID is required');
        }
        if (!data.nombre) {
            throw new Error('Specialty name is required');
        }
    }

    isActive() {
        return this.activo === true;
    }

    toJSON() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            departamentoId: this.departamentoId,
            activo: this.activo
        };
    }

    static fromDatabase(dbData) {
        return new Specialty({
            id: dbData.IdEspecialidad,
            nombre: dbData.Descripcion,
            IDDPTOESPECILIDAD: dbData.IDDPTOESPECILIDAD,
            Activo: dbData.Activo === 1
        });
    }
}

module.exports = Specialty;