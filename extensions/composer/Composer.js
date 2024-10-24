import { ref, reactive } from 'vue';
import { OpenAI } from './openai.js';

export default {
  name: 'ChatPanel',
  props: {
    api: {
      type: String,
      required: true,
    },
    // model: {
    //   type: String,
    //   default: 'llamacoder',
    // },
    editor: {
      type: Object, // Ace editor instance
      required: true,
    },
  },
  setup(props) {
    const inputMessage = ref('');
    const messages = ref([]);
    const state = reactive({
      model: 'codellama',
      models: []
    });

    // Append a message to the chat panel
    const appendMessage = (user, text) => {
      messages.value.push({ user, text });
      // Scroll the chat box to the bottom
      const chatBox = document.getElementById('chat-box');
      chatBox.scrollTop = chatBox.scrollHeight;
    };

    async function getModels() {
      const response = await fetch('http://localhost:11434/v1/models')
      const data = await response.json()
      return data.data;
    }
    getModels().then(models => {
      state.models = models;
    })

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
      const message = reactive({
        user: 'Ollama',
        text: 'Generating response...',
        pending: true
      })
      messages.value.push(message);
      try {

        const openai = new OpenAI({
          serverUrl: props.api,
          // apiKey: localStorage['OPENAI_API_KEY'], // This is the default and can be omitted
        });

        const { editor } = props;
        const messages = [
          { role: 'system', content: 'You are an experienced developer. Be very brief. Respond only with code.' },
          { role: 'user', content: `Use the following code: ${editor.getValue()}`},
          // { role: 'user', content: `Respond in the following format: PARTIAL: <start line> <end line>\n<the new code>`},
          { role: 'user', content: userMessage }
        ]

        const stream = await openai.chat.completions.create({
          messages,
          model: state.model,
          stream: true
        });
        let accumulatedText = ''; // Accumulate the response text

        for await (const message of stream) {
          // console.log(message);
          const deltaText = message.choices[0]?.delta?.content || '';

          // Update the editor with the streamed delta text
          accumulatedText += deltaText;
          props.editor.setValue(accumulatedText, -1); // Keep cursor at the end

          // Append the delta to the chat as well
          // appendMessage('Ollama', deltaText);
          // page.content += message.choices[0]?.delta?.content || ''
        }

        message.text = 'done'
        message.pending = false
      } catch (error) {
        console.error('Error fetching API response:', error);
        appendMessage('Ollama', 'Error getting response from Ollama.');
      }
    };

    return {
      state,
      inputMessage,
      messages,
      sendMessage,
    };
  },
  template: `  <div class="chat-panel">
  <select v-model="state.model">
    <option v-for="model in state.models" :key="model.id" :value="model.id">{{model.id}}</option>
  </select>
    <div id="chat-box" class="chat-box">
      <div v-for="(message, index) in messages" :key="index" class="chat-message" :class="{'response': message.user === 'Ollama'}">
        {{ message.user }}: 
        <div v-if='message.pending'>generating...</div>
        <div v-if='!message.pending'>
        {{ message.text }}
        </div>
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
