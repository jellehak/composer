import { createApp, reactive } from 'vue';
import ChatPanel from './extensions/composer/Composer.js';
import { FileTree } from './extensions/fs/index.js';

function debounce(func, wait = 1000) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  }
}

const app = createApp({
  components: {
    ChatPanel,
    FileTree
  },
  setup() {
    return reactive({
      contentDebounced: '',
      apiEndpoint: 'http://localhost:11434/v1',
      model: 'codellama',
      editor: null, // This will be your Ace editor instance
    });
  },
  mounted() {
    // Initialize Ace Editor when the component mounts
    this.editor = ace.edit("editor");

    const { editor } = this
    editor.setTheme("ace/theme/monokai");
    // editor.session.setMode("ace/mode/javascript");
    editor.session.setMode("ace/mode/html");

    // Persist editor
    editor.setValue(localStorage.getItem('editorContent') || '');

    const persistContent = () => {
      const content = editor.getValue();
      this.contentDebounced = content;
      // console.log(content);
      localStorage.setItem('editorContent', content);
    }
    const debouncedPersist = debounce(persistContent, 1000);
    editor.getSession().on('change', () => {
      // console.log('change')
      debouncedPersist()
    });
  },
  methods: {
    toBlob(string = '') {
      return URL.createObjectURL(new Blob([string], { type: 'text/html' }))
    },
    async onClick({ node }) {
      // console.log({...node});
      const fileHandle = node.entry //.getFileHandle();
      const file = await fileHandle.getFile();
      // console.log(file);
      const contents = await file.text();

      const { editor } = this
      // editor.session.insert(cursorPosition, deltaText); // -1 keeps the cursor at the end of the text
      editor.setValue(contents);
      editor.clearSelection(); // This will remove the highlight over the text


    }
  }
});

app.mount('#app');
