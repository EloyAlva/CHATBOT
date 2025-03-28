const sql = require('mssql');
const ErrorHandler = require('./src/utils/ErrorHandler');

class DatabaseConnection {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = await sql.connect(this.config);
            console.log('Database connected successfully');
            return this.pool;
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, 'connection');
        }
    }

    async disconnect() {
        if (this.pool) {
            try {
                await this.pool.close();
                console.log('Database connection closed');
            } catch (error) {
                ErrorHandler.handleDatabaseError(error, 'disconnection');
            }
        }
    }

    async query(queryString, params = {}) {
        let connection;
        try {
            connection = await this.connect();
            const request = connection.request();
            
            Object.entries(params).forEach(([key, value]) => {
                request.input(key, value.type, value.value);
            });

            const result = await request.query(queryString);
            return result.recordset;
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, 'query execution');
        } finally {
            if (connection) {
                await this.disconnect();
            }
        }
    }
}

const config = {
    user: 'sqladministrador',
    password: '12345678',
    server: 'localhost\\MSSQLSERVERLOCAL',
    database: 'dbCupo',
    options: {
        encrypt: false,
        trustServerCertificate: false,
        enableArithAbort: true,
        requestTimeout: 30000
    }
};

const db = new DatabaseConnection(config);

async function getSpecialties() {
    try {
        console.log('\n=== Getting Specialties ===');
        
        const query = `
            SELECT 
                E.IdEspecialidad as id, 
                E.Descripcion as nombre 
            FROM ESPECIALIDAD_WEB E WITH (NOLOCK)
            INNER JOIN DPTO_ESPECIALIDAD_WEB D WITH (NOLOCK)
                ON E.IDDPTOESPECILIDAD = D.IdDpto
            WHERE E.Activo = 1
            ORDER BY E.Descripcion`;

        const result = await db.query(query);
        
        console.log('Query executed successfully');
        console.log('Specialties found:', result.length);
        
        if (!result.length) {
            console.log('No specialties found');
            return [];
        }

        return result;

    } catch (err) {
        console.error('Error fetching specialties:', {
            message: err.message,
            code: err.code,
            state: err.state,
            stack: err.stack
        });
        throw new Error(`Error fetching specialties: ${err.message}`);
    }
}

async function getPatientByDNI(dni) {
    try {
        console.log('\n=== Database Connection ===');

        const query = `
            SELECT TOP 1 
                HCLINICA as id,
                Nombres + ' ' + LTRIM(RTRIM(APATERNO)) + ' ' + LTRIM(RTRIM(AMaterno)) as nombreCompleto,
                DATEDIFF(YEAR, FNACIMIENTO, GETDATE()) as edad 
            FROM HCLINICAS_WEB WITH (NOLOCK)
            WHERE Doc_Identidad = @dni`;

        console.log('Executing query:', {
            sql: query,
            params: { dni }
        });

        const result = await db.query(query, { dni: { type: sql.VarChar(8), value: dni } });
        console.log('Query result:', {
            recordCount: result.length,
            data: result[0] || 'No records found'
        });

        return result[0];

    } catch (err) {
        console.error('Database Error:', {
            message: err.message,
            code: err.code,
            state: err.state,
            class: err.class,
            procedure: err.procName,
            lineNumber: err.lineNumber,
            inputDNI: dni
        });
        throw err;
    }
}

async function getAvailableAppointments(especialidadId) {
    try {
        console.log('\n=== Getting Available Appointments ===');
        
        const query = `
        WITH HorasProgramadas AS (
            SELECT 
                P.IdProgramacion,
                P.Fecha, 
                P.IdMedico1, 
                P.IdSubEspecialidad, 
                P.Turno, 
                H.Hora
            FROM ProgramacionCE_WEB P
            CROSS JOIN (
                SELECT Hora = '08:00' UNION ALL
                SELECT '08:15' UNION ALL
                SELECT '08:30' UNION ALL
                SELECT '08:45' UNION ALL
                SELECT '09:00' UNION ALL
                SELECT '09:15' UNION ALL
                SELECT '09:30' UNION ALL
                SELECT '09:45' UNION ALL
                SELECT '10:00' UNION ALL
                SELECT '10:15' UNION ALL
                SELECT '10:30' UNION ALL
                SELECT '10:45' UNION ALL
                SELECT '11:00' UNION ALL
                SELECT '11:15' UNION ALL
                SELECT '11:30' UNION ALL
                SELECT '11:45' UNION ALL
                SELECT '12:00'
            ) AS H
            WHERE P.Turno = 'MAÑANA'
        ),
        HorasDisponibles AS (
            SELECT 
                HP.IdProgramacion,
                HP.Fecha AS FechaCita, 
                HP.IdMedico1, 
                HP.IdSubEspecialidad, 
                HP.Hora
            FROM HorasProgramadas HP
            LEFT JOIN CupoWeb C ON 
                HP.Fecha = C.FechaCita 
                AND HP.IdMedico1 = C.CodMedico 
                AND HP.Turno = C.Turno 
                AND HP.IdSubEspecialidad = C.IdSubEspecialidad 
                AND HP.Hora = C.HoraCita
            WHERE C.HoraCita IS NULL
        )
        SELECT 
            HD.IdProgramacion,
            HD.FechaCita, 
            M.IdMedico, 
            M.Medico, 
            COUNT(HD.Hora) AS CuposDisponibles, 
            MIN(HD.Hora) AS PrimeraHoraDisponible
        FROM HorasDisponibles HD
        INNER JOIN ESPECIALIDAD_WEB E ON E.IdEspecialidad = HD.IdSubEspecialidad
        INNER JOIN Medicos_Web M ON M.IdMedico = HD.IdMedico1
        WHERE HD.IdSubEspecialidad = @especialidadId
        AND HD.FechaCita IN (
            SELECT DISTINCT TOP 3 FechaCita 
            FROM HorasDisponibles 
            WHERE FechaCita >= GETDATE() 
            ORDER BY FechaCita
        )
        GROUP BY HD.IdProgramacion, HD.FechaCita, M.IdMedico, M.Medico
        ORDER BY HD.FechaCita`;

        console.log('Executing query for specialty:', especialidadId);
        
        const result = await db.query(query, { especialidadId: { type: sql.Int, value: especialidadId } });

        console.log('Query executed successfully');
        console.log('Results found:', result.length);

        return result;

    } catch (err) {
        console.error('Database Error:', {
            message: err.message,
            code: err.code,
            state: err.state,
            specialtyId: especialidadId
        });
        throw err;
    }
}

async function registerAppointment(appointmentData) {
    try {
        console.log('\n=== Registering New Appointment ===');

        const query = `
        INSERT INTO CupoWeb (
            Doc_Identidad, APaterno, AMaterno, Nombres, Edad, FechaRegistro, HoraRegistro, FechaCita, HoraCita
            Especialidad, SubEspecialidad, IdSubEspecialidad, Cupo, Anulado, Equipo, Cancelado, 
            IdComprobante, Atendido, CodMedico, NomMedico, TipoCupo, IdProgramacion, Reportado, AtencionCreditoCaja, 
            Impreso, UsuarioRegistro, FechaImp, Monto, TipoAtencion, TipoCupoO, 
            FechaInicioAtencion, HoraInicioAtencion, FechaFinAtencion, HoraFinAtencion, 
            EquipoInicioAtencion, EquipoFinAtencion, Redigitado, Exonerado, IdHistoria, 
            Modalidad, IdIncapacidad, DescripcionIncapacidad, Created_System, Updated_System
        )
        SELECT 
            H.Doc_Identidad, APaterno, AMaterno, Nombres, 
            DATEDIFF(YEAR, FNACIMIENTO, GETDATE()) - 
                CASE 
                    WHEN (MONTH(FNACIMIENTO) > MONTH(GETDATE())) 
                    OR (MONTH(FNACIMIENTO) = MONTH(GETDATE()) AND DAY(FNACIMIENTO) > DAY(GETDATE())) 
                    THEN 1 ELSE 0 
                END AS Edad,
            GETDATE() AS FechaRegistro, 
            CONVERT(VARCHAR(8), GETDATE(), 108) AS HoraRegistro, 
            @FechaCita AS FechaCita, 
            @Cupo AS HoraCita,
            D.Descripcion AS Especialidad, 
            E.Descripcion AS SubEspecialidad, 
            E.IdEspecialidad AS IdSubEspecialidad, 
            @Cupo AS Cupo, 
            0 AS Anulado, 
            '' AS Equipo, 
            0 AS Cancelado, 
            NULL AS IdComprobante, 
            0 AS Atendido, 
            @IdMedico as CodMedico,
            @NomMedico AS NomMedico,
            'NUEVO' AS TipoCupo, 
            @IdProgramacion AS IdProgramacion, 
            1 AS Reportado, 
            1 AS AtencionCreditoCaja, 
            0 AS Impreso,
            'CHATBOT-CHARLIE' AS UsuarioRegistro, 
            NULL AS FechaImp, 
            '0.00' AS Monto, 
            'CONSULTA' AS TipoAtencion, 
            'NUEVO' AS TipoCupoO, 
            NULL AS FechaInicioAtencion, 
            NULL AS HoraInicioAtencion, 
            NULL AS FechaFinAtencion, 
            NULL AS HoraFinAtencion, 
            NULL AS EquipoInicioAtencion, 
            NULL AS EquipoFinAtencion, 
            'NO' AS Redigitado, 
            'NO' AS Exonerado, 
            H.HClinica AS IdHistoria, 
            0 AS Modalidad, 
            1 AS IdIncapacidad, 
            NULL AS DescripcionIncapacidad, 
            NULL AS Created_System, 
            NULL AS Updated_System
        FROM HCLINICAS_WEB H 
        CROSS JOIN ESPECIALIDAD_WEB E 
        INNER JOIN DPTO_ESPECIALIDAD_WEB D 
            ON E.IDDPTOESPECILIDAD = D.IdDpto 
            AND E.IdEspecialidad = @especialidadId
        WHERE H.Doc_Identidad = @NumeroDocumento 
        AND E.IdEspecialidad = @especialidadId;

        SELECT SCOPE_IDENTITY() AS NewAppointmentId;`;

        const result = await db.query(query, {
            NumeroDocumento: { type: sql.VarChar(20), value: appointmentData.numeroDocumento },
            especialidadId: { type: sql.Int, value: appointmentData.especialidadId },
            IdMedico: { type: sql.VarChar(10), value: appointmentData.idMedico },
            NomMedico: { type: sql.VarChar(100), value: appointmentData.nombreMedico },
            FechaCita: { type: sql.Date, value: appointmentData.fechaCita },
            Cupo: { type: sql.VarChar(10), value: appointmentData.horaCita },
            IdProgramacion: { type: sql.VarChar(10), value: appointmentData.idProgramacion }
        });

        console.log('Appointment registered successfully');
        return result[0];

    } catch (err) {
        console.error('Error registering appointment:', {
            message: err.message,
            code: err.code,
            state: err.state,
            data: appointmentData
        });
        throw new Error(`Error registering appointment: ${err.message}`);
    }
}

// Export all functions
module.exports = {
    getSpecialties,
    getPatientByDNI,
    getAvailableAppointments,
    registerAppointment
};