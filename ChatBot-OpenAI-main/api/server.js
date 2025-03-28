import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import sql from 'mssql';

const app = express();

// Configure CORS before any routes
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());

// Add preflight handling
app.options('*', cors());

// Enhanced middleware
app.use((req, res, next) => {
    // Force JSON content type
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Patient route
app.get('/api/patient/:dni', async (req, res) => {
    try {
        const pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('dni', sql.VarChar(20), req.params.dni)
            .query(`
                SELECT 
                    Doc_Identidad,
                    Nombres,
                    APaterno,
                    AMaterno,
                    DATEDIFF(YEAR, FNACIMIENTO, GETDATE()) AS Edad,
                    HClinica
                FROM HCLINICAS_WEB 
                WHERE Doc_Identidad = @dni
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'Patient not found',
                message: 'No se encontró el paciente con el DNI especificado'
            });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            error: 'Database error',
            message: 'Error al buscar el paciente'
        });
    } finally {
        sql.close();
    }
});

// Add this endpoint before the appointments endpoint
app.get('/api/specialties', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config.database);
        
        const result = await pool.request()
            .query(`
                SELECT 
                    E.IdEspecialidad AS IdSubEspecialidad, 
                    E.Descripcion as Nombre 
                FROM ESPECIALIDAD_WEB E WITH (NOLOCK)
                INNER JOIN DPTO_ESPECIALIDAD_WEB D WITH (NOLOCK)
                    ON E.IDDPTOESPECILIDAD = D.IdDpto
                WHERE E.ESTADO = 1
                ORDER BY E.Descripcion
            `);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({
                status: 'not_found',
                message: 'No se encontraron especialidades'
            });
        }

        res.json({
            status: 'success',
            data: result.recordset
        });

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            state: error.state
        });
        
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener especialidades',
            details: error.message
        });
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error('Error closing pool:', err);
            }
        }
    }
});

// API routes with error handling
app.get('/api/appointments/:especialidadId', async (req, res) => {
    let pool;
    try {
        // Force JSON content type
        res.setHeader('Content-Type', 'application/json');

        const especialidadId = parseInt(req.params.especialidadId);
        if (isNaN(especialidadId)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de especialidad inválido'
            });
        }

        pool = await sql.connect(config.database);
        const result = await pool.request()
            .input('especialidadId', sql.Int, especialidadId)
            .query(`WITH HorasProgramadas AS (
    SELECT 
        P.IdProgramacion,
        P.Fecha AS FechaCita,
        P.IdMedico1,
        P.IdSubEspecialidad,
        H.Hora
    FROM ProgramacionCE_WEB P WITH (NOLOCK)
    CROSS JOIN (VALUES 
        ('08:00'), ('08:15'), ('08:30'), ('08:45'), ('09:00'),
        ('09:15'), ('09:30'), ('09:45'), ('10:00'), ('10:15'),
        ('10:30'), ('10:45'), ('11:00'), ('11:15'), ('11:30'),
        ('11:45'), ('12:00')
    ) AS H(Hora)
    WHERE P.Turno = 'MAÑANA'
    AND P.Fecha >= GETDATE()
    AND P.IdSubEspecialidad = @especialidadId
),
HorasDisponibles AS (
    SELECT 
        HP.IdProgramacion,
        HP.FechaCita,
        HP.IdMedico1,
        HP.IdSubEspecialidad,
        HP.Hora
    FROM HorasProgramadas HP
    LEFT JOIN CupoWeb C WITH (NOLOCK) 
        ON C.FechaCita = HP.FechaCita 
        AND C.CodMedico = HP.IdMedico1 
        AND C.IdSubEspecialidad = HP.IdSubEspecialidad 
        AND C.HoraCita = HP.Hora
    WHERE C.HoraCita IS NULL
),
FechasDisponibles AS (
    SELECT DISTINCT TOP 3 FechaCita 
    FROM HorasDisponibles 
    ORDER BY FechaCita
)
SELECT 
    HD.IdProgramacion,
    CONVERT(VARCHAR(10), HD.FechaCita, 23) AS FechaCita,
    M.IdMedico, 
    M.Medico, 
    COUNT(HD.Hora) AS CuposDisponibles, 
    MIN(HD.Hora) AS PrimeraHoraDisponible
FROM HorasDisponibles HD
INNER JOIN FechasDisponibles FD ON HD.FechaCita = FD.FechaCita
INNER JOIN Medicos_Web M WITH (NOLOCK) ON M.IdMedico = HD.IdMedico1
GROUP BY HD.IdProgramacion, HD.FechaCita, M.IdMedico, M.Medico
ORDER BY HD.FechaCita`);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No hay citas disponibles'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: result.recordset
        });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al buscar citas disponibles',
            details: error.message
        });
    } finally {
        if (pool) await pool.close();
    }
});

const connectWithRetry = async (retries = 5) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const pool = await sql.connect(config.database);
            console.log('Database connection successful');
            return pool;
        } catch (error) {
            lastError = error;
            console.error(`Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
            }
        }
    }
    throw new Error(`Failed to connect after ${retries} attempts: ${lastError.message}`);
};

app.post('/api/appointments/register', async (req, res) => {
    let pool;
    try {
        // Use the new connection function
        pool = await connectWithRetry();
        
        // Log the incoming request
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const { 
            IdProgramacion,
            IdSubEspecialidad,
            IdMedico,
            FechaCita,
            HoraCita,
            DNI,
            Turno = 'MAÑANA'
        } = req.body;

        // Convert and validate IDs
        const programacionId = parseInt(IdProgramacion);
        const especialidadId = parseInt(IdSubEspecialidad);

        if (isNaN(programacionId) || isNaN(especialidadId)) {
            console.error('Invalid IDs:', { programacionId, especialidadId });
            return res.status(400).json({
                status: 'error',
                message: 'IDs inválidos',
                details: 'IdProgramacion e IdSubEspecialidad deben ser números'
            });
        }

        // Validate other required fields
        if (!IdMedico || !FechaCita || !HoraCita || !DNI) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos incompletos',
                details: 'Todos los campos son requeridos'
            });
        }

        // Connect to database
        pool = await sql.connect(config.database);
        
        // Execute stored procedure
        const result = await pool.request()
            .input('IdProgramacion', sql.Int, programacionId)
            .input('IdSubEspecialidad', sql.Int, especialidadId)
            .input('IdMedico', sql.VarChar(10), IdMedico)
            .input('FechaCita', sql.Date, new Date(FechaCita))
            .input('HoraCita', sql.VarChar(5), HoraCita)
            .input('DNI', sql.VarChar(8), DNI)
            .input('Turno', sql.VarChar(10), Turno)
            .execute('sp_RegisterAppointment');

        console.log('Stored procedure result:', result);

        res.status(201).json({
            status: 'success',
            message: 'Cita registrada exitosamente',
            data: {
                IdProgramacion: programacionId,
                IdSubEspecialidad: especialidadId,
                FechaCita,
                HoraCita,
                DNI
            }
        });

    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            code: error.code,
            state: error.state
        });
        res.status(500).json({
            status: 'error',
            message: 'Error al registrar la cita',
            details: error.message
        });
    } finally {
        if (pool) {
            try {
                await pool.close();
                console.log('Connection closed successfully');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Add this route for testing
app.get('/api/debug/register', (req, res) => {
    res.json({
        status: 'success',
        message: 'Registration endpoint is active',
        endpoint: '/api/appointments/register',
        method: 'POST',
        requiredFields: [
            'IdProgramacion',
            'IdSubEspecialidad',
            'IdMedico',
            'FechaCita',
            'HoraCita',
            'DNI',
            'Turno'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        details: err.message
    });
});

// Start server
const port = config.server.port || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

export const server = app;