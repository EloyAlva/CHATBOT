export class Message {
    constructor(data) {
        this.id = data.id || Date.now();
        this.content = data.content;
        this.type = data.type || 'user'; // 'user' or 'bot'
        this.timestamp = data.timestamp || new Date();
        this.metadata = data.metadata || {};
    }

    static createUserMessage(content) {
        return new Message({
            content,
            type: 'user'
        });
    }

    static createBotMessage(content, metadata = {}) {
        return new Message({
            content,
            type: 'bot',
            metadata
        });
    }

    toHTML() {
        return `
            <div class="${this.type === 'bot' ? 'response' : 'message'}">
                <div class="message-header">
                    ${this.type === 'bot' ? 
                        '<img src="./charlie.ico" class="avatar" alt="Charlie">' : 
                        ''
                    }
                    <span class="sender-name">
                        ${this.type === 'bot' ? 'Charlie' : 'Usuario'}
                    </span>
                </div>
                <p>${this.content}</p>
            </div>
        `;
    }

    toJSON() {
        return {
            id: this.id,
            content: this.content,
            type: this.type,
            timestamp: this.timestamp,
            metadata: this.metadata
        };
    }
}