import { config } from './config.js';
import { ChatController } from './src/controllers/ChatController.js';
import { DatabaseService } from './src/services/DatabaseService.js';
import { ChatService } from './src/services/ChatService.js';
import { AppointmentService } from './src/services/AppointmentService.js';
import { PatientController } from './src/controllers/PatientController.js';
import { Message } from './src/models/Message.js';

class ChatApplication {
    constructor() {
        this.dbService = new DatabaseService(config.database);
        this.chatService = new ChatService(config.openai);
        this.appointmentService = new AppointmentService(this.dbService);
        this.patientController = new PatientController(this.dbService);
        this.chatController = new ChatController(
            this.chatService, 
            this.appointmentService, 
            this.patientController
        );

        this.setupDOMElements();
        this.attachEventListeners();
    }

    setupDOMElements() {
        this.chatBox = document.querySelector(".chat-box");
        if (!this.chatBox) {
            throw new Error('Chat box element not found');
        }
        
        this.inputField = this.chatBox.querySelector("input[type='text']");
        this.sendButton = this.chatBox.querySelector("button");
        this.chatBoxBody = this.chatBox.querySelector(".chat-box-body");

        // Verify elements exist
        if (!this.inputField || !this.sendButton || !this.chatBoxBody) {
            throw new Error('Required chat elements not found');
        }
    }

    attachEventListeners() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeChat());
        } else {
            this.initializeChat();
        }

        // Add button click handler
        this.sendButton.addEventListener("click", () => this.handleSendMessage());
        
        // Add enter key handler
        this.inputField.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.handleSendMessage();
            }
        });
    }

    async initializeChat() {
        try {
            await this.chatController.initialize();
            console.log('Chat initialized successfully');
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Error al iniciar el chat. Por favor, recarga la página.');
        }
    }

    async handleSendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        try {
            // Disable input while processing
            this.inputField.disabled = true;
            this.sendButton.disabled = true;

            // Clear input and show user message
            this.inputField.value = '';
            const userMessage = Message.createUserMessage(message);
            this.updateChatUI(userMessage);

            // Get bot response
            console.log('Sending message:', message);
            const response = await this.chatController.handleMessage(message);
            console.log('Received response:', response);

            // Show bot response
            if (response) {
                const botMessage = Message.createBotMessage(response);
                this.updateChatUI(botMessage);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            this.showError('Lo siento, ha ocurrido un error. Por favor, intenta nuevamente.');
        } finally {
            // Re-enable input
            this.inputField.disabled = false;
            this.sendButton.disabled = false;
            this.inputField.focus();
        }
    }

    updateChatUI(message) {
        if (!message || !message.toHTML) {
            console.error('Invalid message object:', message);
            return;
        }

        const messageHTML = message.toHTML();
        this.chatBoxBody.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    showError(message) {
        const errorMessage = Message.createBotMessage(message, { type: 'error' });
        this.updateChatUI(errorMessage);
    }

    scrollToBottom() {
        this.chatBoxBody.scrollTop = this.chatBoxBody.scrollHeight;
    }
}

// Initialize application only after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.chatApp = new ChatApplication();
    } catch (error) {
        console.error('Failed to initialize chat application:', error);
    }
});

