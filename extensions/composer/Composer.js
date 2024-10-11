import { ref } from 'vue';

export default {
  name: 'ChatPanel',
  props: {
    api: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      default: 'llama2',
    },
    editor: {
      type: Object, // Ace editor instance
      required: true,
    },
  },
  setup(props) {
    const inputMessage = ref('');
    const messages = ref([]);

    // Append a message to the chat panel
    const appendMessage = (user, text) => {
      messages.value.push({ user, text });
      // Scroll the chat box to the bottom
      const chatBox = document.getElementById('chat-box');
      chatBox.scrollTop = chatBox.scrollHeight;
    };

    // Send a message and handle the API response stream
    const sendMessage = async () => {
      const message = inputMessage.value.trim();
      if (!message) return;

      // Append user message to the chat
      appendMessage('User', message);
      inputMessage.value = ''; // Clear input field

      // Stream the response from Ollama API
      await streamResponse(message);
    };

    // Stream response from Ollama API
    const streamResponse = async (userMessage) => {
      try {
        const response = await fetch(props.api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: props.model,
            prompt: userMessage,
            stream: true, // Enable streaming
          }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        let accumulatedText = ''; // Accumulate the response text
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          const chunk = decoder.decode(value, { stream: true });

          // Parse each streamed chunk and extract the delta
          const lines = chunk.split('\n');
          for (let line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed && parsed.delta) {
                const deltaText = parsed.delta;

                // Update the editor with the streamed delta text
                accumulatedText += deltaText;
                props.editor.setValue(accumulatedText, -1); // Keep cursor at the end

                // Append the delta to the chat as well
                appendMessage('Ollama', deltaText);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching API response:', error);
        appendMessage('Ollama', 'Error getting response from Ollama.');
      }
    };

    return {
      inputMessage,
      messages,
      sendMessage,
    };
  },
  template: `  <div class="chat-panel">
    <h2>Chat Panel</h2>
    <div id="chat-box" class="chat-box">
      <div v-for="(message, index) in messages" :key="index" class="chat-message" :class="{'response': message.user === 'Ollama'}">
        {{ message.user }}: {{ message.text }}
      </div>
    </div>

    <div class="chat-input-box">
      <input
        type="text"
        v-model="inputMessage"
        placeholder="Type your message..."
        @keypress.enter="sendMessage"
      />
      <button @click="sendMessage">Send</button>
    </div>
  </div>`
};
