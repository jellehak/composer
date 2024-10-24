// https://developer.chrome.com/docs/capabilities/web-apis/file-system-access#opening_a_directory_and_enumerating_its_contents

export function activate(context) {
    const { container, apiEndpoint, model, editor } = context;

    
}

const FileTreeNode = {
    name: 'FileTreeNode',
    template: `
        <li>
          <button @click="onClick(node)" :class="{ folder: node.isDirectory, file: !node.isDirectory }">{{ node.name }}</button>
          <ul v-if="node.children && node.children.length">
            <file-tree-node @item:click="onClick" v-for="(child, index) in node.children" :key="index" :node="child"></file-tree-node>
          </ul>
        </li>
      `,
    props: {
        node: {
            type: Object,
            required: true,
        },
    },
    methods: {
        onClick(node) {
            this.$emit('item:click', node);
        },
    }
};

export const FileTree = {
    components: {
        FileTreeNode
    },
    template: `
        <div>
          <button @click="openDirectory">Open Directory</button>
          <div v-if="fileTree">
            <ul>
              <file-tree-node @item:click="onClick" :node="fileTree"></file-tree-node>
            </ul>
          </div>
        </div>
      `,
    data() {
        return {
            fileTree: null,
        };
    },
    mounted() {
        if ('showOpenFilePicker' in self) {
            // The `showOpenFilePicker()` method of the File System Access API is supported.
          }
    },
    methods: {
       
        onClick(node) {
            this.$emit('item:click', {node})
        },
        async openDirectory() {
            try {
                const directoryHandle = await window.showDirectoryPicker();
                this.fileTree = await this.buildFileTree(directoryHandle);
            } catch (err) {
                console.error('Error accessing file system:', err);
            }
        },
        async buildFileTree(directoryHandle) {
            const tree = { name: directoryHandle.name, isDirectory: true, children: [] };

            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file') {
                    tree.children.push({ entry, name: entry.name, isDirectory: false });
                } else if (entry.kind === 'directory') {
                    const subTree = await this.buildFileTree(entry);
                    tree.children.push(subTree);
                }
            }

            return tree;
        },
    },
};

import { get, set } from 'https://unpkg.com/idb-keyval@5.0.2/dist/esm/index.js';

async function writeFile(fileHandle, contents) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    // Write the contents of the file to the stream.
    await writable.write(contents);
    // Close the file and write the contents to disk.
    await writable.close();
  }
async function saveFile() {
    const options = {
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt'],
          },
        },
      ],
    };
    const handle = await window.showSaveFilePicker(options);
    return handle;
  }
