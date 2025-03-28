export const config = {
    database: {
        user: 'sqladministrador',
        password: '12345678',
        server: 'localhost\\MSSQLSERVERLOCAL',
        database: 'dbCupo',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            requestTimeout: 30000,        // Increase timeout to 30 seconds
            connectionTimeout: 30000,     // Connection timeout
            connectRetryInterval: 1000    // Retry every second
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000,  // Timeout for acquiring connection
            createTimeoutMillis: 30000,   // Timeout for creating connection
            destroyTimeoutMillis: 5000,   // Timeout for destroying connection
            reapIntervalMillis: 1000,     // How often to check for idle connections
            createRetryIntervalMillis: 200 // Retry interval for creating connections
        }
    },
    server: {
        port: process.env.PORT || 3000,
        corsOrigin: 'http://localhost:3001'
    }
};