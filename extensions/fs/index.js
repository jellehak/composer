export function activate(context) {
    const { container, apiEndpoint, model, editor } = context;

    
}

const FileTreeNode = {
    name: 'FileTreeNode',
    template: `
        <li>
          <span :class="{ folder: node.isDirectory, file: !node.isDirectory }">{{ node.name }}</span>
          <ul v-if="node.children && node.children.length">
            <file-tree-node v-for="(child, index) in node.children" :key="index" :node="child"></file-tree-node>
          </ul>
        </li>
      `,
    props: {
        node: {
            type: Object,
            required: true,
        },
    },
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
              <file-tree-node :node="fileTree"></file-tree-node>
            </ul>
          </div>
        </div>
      `,
    data() {
        return {
            fileTree: null,
        };
    },
    methods: {
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
                    tree.children.push({ name: entry.name, isDirectory: false });
                } else if (entry.kind === 'directory') {
                    const subTree = await this.buildFileTree(entry);
                    tree.children.push(subTree);
                }
            }

            return tree;
        },
    },
};

