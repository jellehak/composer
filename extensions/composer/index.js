export function activate(context) {
    const { container, apiEndpoint, model, editor } = context;

    // Initialize chat panel
    const chatPanel = new ChatPanel({
        container,   // The container where the chat panel will be rendered
        apiEndpoint, // Ollama API endpoint (e.g., http://localhost:11434/v1/generate)
        model,       // Model name (e.g., 'llama2')
        editor       // Ace editor instance to stream the output
    });
}

let isCodeBlock = false;

class ChatPanel {
    history = [];

    constructor(config) {
        this.apiEndpoint = config.apiEndpoint;
        this.model = config.model;
        this.container = document.querySelector(config.container);
        this.editor = config.editor; // Ace Editor instance passed in context
        this.value = localStorage.getItem('chatLastMessage') || 'snake game in html';
        this.init();
    }

    // Initialize the chat panel structure
    init() {
        const chatPanel = document.createElement('div');
        chatPanel.classList.add('chat-panel');

        chatPanel.innerHTML = `
            <div id="chat-box" class="chat-box"></div>
            <div class="chat-input-box">
                <input type="text" id="chat-input" value="${this.value}" placeholder="Type your message...">
                <button id="send-btn">Send</button>
                <button id="stop-btn">Stop</button>
            </div>
        `;

        this.container.appendChild(chatPanel);

        // Get references to input and chat box elements
        this.chatPanel = chatPanel;
        this.chatInput = chatPanel.querySelector('#chat-input');
        this.sendBtn = chatPanel.querySelector('#send-btn');
        this.chatBox = chatPanel.querySelector('#chat-box');

        // Bind the events
        this.bindEvents();
    }

    // Bind input and button events
    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSend();
            }
        });
    }

    // Handle sending the message
    handleSend() {
        this.history.push(this.chatInput.value);
        // localStorage.setItem('chatHistory', this.chatInput.value)
        localStorage.setItem('chatLastMessage', this.chatInput.value)
        
        const message = this.chatInput.value.trim();
        if (message) {
            this.appendMessage('User', message);
            this.streamResponse(message);  // Stream the response
            this.chatInput.value = ''; // Clear input
        }
    }

    // Append message to chat
    appendMessage(user, message) {
        const chatMessage = document.createElement('div');
        chatMessage.classList.add('chat-message');
        chatMessage.textContent = `${user}: ${message}`;
        this.chatBox.appendChild(chatMessage);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    // Append AI response
    appendResponse(message) {
        const lastMessage = this.chatBox.querySelector('.chat-message:last-child');
        if (lastMessage) {
            lastMessage.innerText += ` ${message}`;
        } else {
            const chatMessage = document.createElement('div');
            chatMessage.classList.add('chat-message', 'response');
            chatMessage.textContent = `${message}`;
            this.chatBox.appendChild(chatMessage);
        }
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    // New composer function to handle parsed delta content
    composer(deltaText) {
       
        let codeContent = '';

        if (deltaText.includes('```')) {
            console.log('Code block detected');
            isCodeBlock = !isCodeBlock;
            // if (!isCodeBlock) {
            //     this.editor.setValue(codeContent, -1); // -1 keeps the cursor at the end of the text
            //     codeContent = '';
            // }
            return
        }

        if (isCodeBlock) {
            const { editor } = this;
            const cursorPosition = editor.getCursorPosition();
            editor.session.insert(cursorPosition, deltaText); // -1 keeps the cursor at the end of the text
            // codeContent += deltaText;
            return
        }
        this.appendResponse(deltaText);
    }

    // Stream response from Ollama API and update Ace editor
    async streamResponse(userMessage) {
        const controller = new AbortController();
        const signal = controller.signal;

        const stopButton = this.chatPanel.querySelector('#stop-btn');
        stopButton.addEventListener('click', () => {
            controller.abort();
        });

        this.appendMessage('System', '');

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are an experienced developer. Be very brief. Use mostly code.' },
                        { role: 'user', content: userMessage }
                    ],
                    stream: true  // Ensure streaming is enabled
                }),
                signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: true });

                // Assume the response is structured in chunks with delta changes
                // Parse each chunk and handle the delta updates
                const lines = chunk.split('\n');

                lines.forEach(line => {
                    if(!line) return

                    const data = line.replace('data: ', '').trim()

                    if (data === '[DONE]') {
                        console.log('Done streaming response');
                        done = true
                        return
                    }
                    if (data) {
                        line = line.replace('data: ', '');
                        const parsed = safeParse(line);
                        const deltaText = parsed.choices[0].delta.content;
                        // console.log(deltaText);
                        // Call composer with the parsed delta content
                        this.composer(deltaText);
                    }
                })
            }
        } catch (error) {
            console.error('Error fetching API response:', error);
            this.appendResponse('Error getting response from Ollama.');
        }
    }
}

function safeParse(text) {
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Error parsing JSON:', error, text);
        return null;
    }
}
