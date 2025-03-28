const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { DatabaseService } = require('./src/services/DatabaseService');
const { AppointmentController } = require('./src/controllers/AppointmentController');
const { PatientController } = require('./src/controllers/PatientController');
const { ChatController } = require('./src/controllers/ChatController');
const config = require('./config');

class ApiServer {
    constructor() {
        this.app = express();
        this.dbService = new DatabaseService(config.database);
        this.setupMiddleware();
        this.setupControllers();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json({ charset: 'utf-8' }));
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true, charset: 'utf-8' }));
        this.app.use(this.setDefaultHeaders);
    }

    setupControllers() {
        this.appointmentController = new AppointmentController(this.dbService);
        this.patientController = new PatientController(this.dbService);
        this.chatController = new ChatController(
            config.openai,
            this.appointmentController,
            this.patientController
        );
    }

    setupRoutes() {
        this.app.get('/api/patient/:dni', (req, res) => this.patientController.getPatient(req, res));
        this.app.get('/api/specialties', (req, res) => this.appointmentController.getSpecialties(req, res));
        this.app.get('/api/appointments/:especialidadId', (req, res) => this.appointmentController.getAvailableAppointments(req, res));
        this.app.post('/api/appointments', (req, res) => this.appointmentController.registerAppointment(req, res));
        this.app.post('/message', (req, res) => this.chatController.analyzeSymptoms(req, res));
    }

    setDefaultHeaders(req, res, next) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Accept-Charset', 'utf-8');
        next();
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
}

const server = new ApiServer();
server.start();