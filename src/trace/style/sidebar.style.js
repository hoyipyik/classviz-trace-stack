/**
 * Add styles for source code display
 */
export function addSourceCodeStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .source-code-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: visible;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 5px;
        }
        
        .source-code-pre {
            white-space: pre;
            padding: 8px;
            margin: 0;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.5;
            overflow-wrap: normal;
            word-break: normal;
            overflow-y: visible;
        }
        
        /* Horizontal scrollbar styling */
        .source-code-container::-webkit-scrollbar {
            height: 6px;
        }
        
        .source-code-container::-webkit-scrollbar-track {
            background: #f5f5f5;
        }
        
        .source-code-container::-webkit-scrollbar-thumb {
            background-color: #ccc;
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Apply styles to the sidebar element
 * @param {HTMLElement} sidebar - The sidebar element
 */
export function applySidebarStyles(sidebar) {
    Object.assign(sidebar.style, {
        width: '270px',
        minWidth: '270px',
        height: '100%',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderLeft: '1px solid #ccc',
        padding: '0',
        overflowY: 'auto',
        transition: 'transform 0.3s ease',
        position: 'absolute',
        right: '0',
        top: '0',
        zIndex: '100',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        transform: 'translateX(100%)'
    });
}