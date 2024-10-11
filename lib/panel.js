class ResizablePanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <div class="container">
          <div class="content">
            <slot></slot>
          </div>
          <div class="resizer"></div>
        </div>
        <style>
          .container {
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
            background-color: #f0f0f0;
          }

          .content {
            padding: 10px;
            box-sizing: border-box;
            overflow-y: auto;
            height: calc(100% - 5px);
          }

          .resizer {
            width: 100%;
            height: 5px;
            background-color: #666;
            cursor: ns-resize;
            position: absolute;
            bottom: 0;
            left: 0;
          }
        </style>
      `;
    }

    connectedCallback() {
      const resizer = this.shadowRoot.querySelector('.resizer');
      const container = this;

      let startY, startHeight;

      const mouseMoveHandler = (event) => {
        const newHeight = startHeight + (event.clientY - startY);
        container.style.height = `${newHeight}px`;
      };

      const mouseUpHandler = () => {
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
      };

      const mouseDownHandler = (event) => {
        startY = event.clientY;
        startHeight = parseInt(window.getComputedStyle(container).height, 10);

        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
      };

      resizer.addEventListener('mousedown', mouseDownHandler);
    }
  }

  customElements.define('resizable-panel', ResizablePanel);