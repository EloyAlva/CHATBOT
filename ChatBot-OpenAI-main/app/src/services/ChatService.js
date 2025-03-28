export class ChatService {
    constructor(config) {
        this.config = config;
    }

    async analyzeSymptoms(patientName, symptoms) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ 
                        role: "user", 
                        content: `Actúa como un asistente médico especializado. 
                        El paciente ${patientName} describe los siguientes síntomas: ${symptoms}
                        
                        Basado en estos síntomas, sugiere exactamente 3 especialidades médicas.
                        
                        Reglas:
                        1. Responde SOLO con las especialidades, separadas por comas
                        2. Usa nombres completos de especialidades (ejemplo: "Medicina Interna" en lugar de "MI")
                        3. No incluyas números ni explicaciones adicionales
                        4. Si no estás seguro, incluye "Medicina General" como una de las opciones
                        
                        Formato de respuesta ejemplo:
                        Medicina Interna, Cardiología, Medicina General`
                    }],
                    max_tokens: 150,
                    temperature: 0.3,
                    presence_penalty: 0,
                    frequency_penalty: 0
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('OpenAI API error:', errorData);
                throw new Error('Error en la llamada a OpenAI API');
            }

            const data = await response.json();
            const specialties = data.choices[0].message.content
                .split(',')
                .map(specialty => specialty.trim())
                .filter(specialty => specialty.length > 0);

            // Ensure we always have 3 specialties
            while (specialties.length < 3) {
                specialties.push('Medicina General');
            }

            // Take only the first 3 if we somehow got more
            return specialties.slice(0, 3);
        } catch (error) {
            console.error('Error analyzing symptoms:', error);
            throw new Error('Error al analizar síntomas');
        }
    }

    async getAllSpecialties() {
        try {
            const response = await fetch('http://localhost:3000/api/specialties');
            if (!response.ok) {
                throw new Error('Error fetching specialties');
            }
            const data = await response.json();
            
            // Log the raw data to verify structure
            console.log('Raw specialties data:', JSON.stringify(data, null, 2));
            
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid specialties data format');
            }
            
            return data.data;
        } catch (error) {
            console.error('Error getting specialties:', error);
            throw error;
        }
    }

    normalizeText(text) {
        if (typeof text !== 'string') {
            console.error('Invalid text for normalization:', text);
            return '';
        }
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    async matchSpecialties(aiSuggestions) {
        try {
            // Validate aiSuggestions
            if (!Array.isArray(aiSuggestions)) {
                console.error('Invalid aiSuggestions format:', aiSuggestions);
                throw new Error('Las sugerencias deben ser un array');
            }

            // Get all specialties from database
            const databaseSpecialties = await this.getAllSpecialties();
            console.log('Database specialties count:', databaseSpecialties.length);

            // Debug log some sample specialties
            console.log('Sample database specialties:', 
                databaseSpecialties.slice(0, 3).map(s => ({
                    IdSubEspecialidad: s.IdSubEspecialidad,
                    Nombre: s.Nombre
                }))
            );

            // Match specialties with detailed logging
            const matchedSpecialties = aiSuggestions
                .map(suggested => {
                    const normalizedSuggested = this.normalizeText(suggested);
                    console.log('Looking for match for:', normalizedSuggested);

                    const match = databaseSpecialties.find(dbSpecialty => {
                        const normalizedDbName = this.normalizeText(dbSpecialty.Nombre);
                        const isMatch = normalizedDbName.includes(normalizedSuggested) ||
                                      normalizedSuggested.includes(normalizedDbName);
                        
                        if (isMatch) {
                            console.log('Found match:', {
                                suggested: normalizedSuggested,
                                dbName: normalizedDbName,
                                originalName: dbSpecialty.Nombre,
                                id: dbSpecialty.IdSubEspecialidad
                            });
                        }
                        
                        return isMatch;
                    });

                    return match;
                })
                .filter(specialty => specialty !== undefined);

            console.log('Final matched specialties:', matchedSpecialties);
            return matchedSpecialties;
        } catch (error) {
            console.error('Error matching specialties:', error);
            throw new Error('Error al procesar las especialidades');
        }
    }
}