const Message = require('./Message');

class Conversation {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.messages = data.messages || [];
        this.patientDNI = data.patientDNI;
        this.status = data.status || 'active';
        this.startTime = data.startTime || new Date();
        this.endTime = null;
        this.metadata = data.metadata || {
            specialtySelected: null,
            appointmentScheduled: false,
            lastInteraction: new Date()
        };
    }

    addMessage(content, type = 'user', metadata = {}) {
        const message = new Message({
            content,
            type,
            metadata
        });
        
        this.messages.push(message);
        this.metadata.lastInteraction = new Date();
        
        return message;
    }

    getLastMessage() {
        return this.messages[this.messages.length - 1];
    }

    getMessagesHistory() {
        return this.messages.map(msg => ({
            content: msg.content,
            type: msg.type,
            timestamp: msg.timestamp
        }));
    }

    endConversation() {
        this.status = 'completed';
        this.endTime = new Date();
    }

    toJSON() {
        return {
            id: this.id,
            patientDNI: this.patientDNI,
            messages: this.messages,
            status: this.status,
            startTime: this.startTime,
            endTime: this.endTime,
            metadata: this.metadata
        };
    }

    static fromJSON(data) {
        return new Conversation({
            id: data.id,
            messages: data.messages.map(m => new Message(m)),
            patientDNI: data.patientDNI,
            status: data.status,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
            metadata: data.metadata
        });
    }
}

module.exports = Conversation;