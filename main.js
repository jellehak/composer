import { createApp, reactive } from 'vue';
import ChatPanel from './extensions/composer/Composer.js';
import {FileTree} from './extensions/fs/index.js';

const app = createApp({
  components: {
    ChatPanel,
    FileTree
  },
  setup() {
    return reactive({
      apiEndpoint: 'http://localhost:11434/v1/chat/completions',
      model: 'llama2',
      editor: null, // This will be your Ace editor instance
    });
  },
  mounted() {
    // Initialize Ace Editor when the component mounts
    this.editor = ace.edit("editor");
    this.editor.setTheme("ace/theme/monokai");
    this.editor.session.setMode("ace/mode/javascript");
  },
});

app.mount('#app');
