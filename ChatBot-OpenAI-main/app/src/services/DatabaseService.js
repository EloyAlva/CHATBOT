export class DatabaseService {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
    }

    async connect() {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.config)
            });

            if (!response.ok) {
                throw new Error('Database connection failed');
            }

            this.isConnected = true;
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection error:', error);
            throw new Error('Failed to connect to database');
        }
    }

    async query(queryString, params = {}) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const response = await fetch(`${this.config.baseUrl}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: queryString,
                    params: params
                })
            });

            if (!response.ok) {
                throw new Error('Query execution failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Query execution error:', error);
            throw new Error('Failed to execute query');
        }
    }

    async disconnect() {
        if (this.isConnected) {
            try {
                await fetch(`${this.config.baseUrl}/api/disconnect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                this.isConnected = false;
                console.log('Database disconnected successfully');
            } catch (error) {
                console.error('Database disconnection error:', error);
                throw new Error('Failed to disconnect from database');
            }
        }
    }
}