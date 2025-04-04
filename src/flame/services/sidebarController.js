import { CONSTANTS } from "./contants.js";

export class FlameSidebarController {
    constructor(containerId, dataMap, flameRenderer, flameChartContainer) {
        this.dataMap = dataMap;
        this.renderer = flameRenderer;
        this.container = document.getElementById(containerId);
        this.flameChartContainer = flameChartContainer;
    }

    initialize() {
        this.createSidebarContentUI();
    }

    createSidebarContentUI() {
        // Clear existing content
        this.container.innerHTML = '';
        
        // Add container styling to make it full width with a border
        this.container.style.width = '100%';
        this.container.style.boxSizing = 'border-box';
        this.container.style.border = '1px solid #ccc';
        
        this.createToggleButtonsUI();
        this.createThreadSelectorUI();
        this.createFlameWidthStyleSelectorUI();
    }

    createToggleButtonsUI() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'flame-toggle-buttons';
        
        // Add CSS for toggle button
        const style = document.createElement('style');
        style.textContent = `
            .flame-toggle-buttons {
                padding: 5px;
                box-sizing: border-box;
                width: 100%;
            }
            .expand-collapse-button {
                width: 100%;
                padding: 6px 10px;
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .expand-collapse-button:hover {
                background-color: #e9e9e9;
            }
            .expand-collapse-icon {
                font-size: 16px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'expand-collapse-button';
        
        // Create button text
        const buttonText = document.createElement('span');
        buttonText.textContent = 'Toggle Flame Chart';
        toggleButton.appendChild(buttonText);
        
        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.className = 'expand-collapse-icon';
        iconElement.textContent = '⇕';
        toggleButton.appendChild(iconElement);
        
        // Add click event listener
        toggleButton.addEventListener('click', () => {
            if (this.flameChartContainer.containerState === CONSTANTS.STATES.MINIMIZED) {
                this.flameChartContainer.setContainerFullyExpand();
                buttonText.textContent = 'Minimize Flame Chart';
            } else {
                this.flameChartContainer.setContainerMinimized();
                buttonText.textContent = 'Expand Flame Chart';
            }
        });
        
        toggleContainer.appendChild(toggleButton);
        this.container.appendChild(toggleContainer);
    }

    createThreadSelectorUI() {
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'thread-selector';
        
        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Thread Selection';
        selectorContainer.appendChild(header);
        
        // Create form for radio buttons
        const form = document.createElement('form');
        form.className = 'thread-selector-form';
        
        // Add CSS for text wrapping and container styling
        const style = document.createElement('style');
        style.textContent = `
            .radio-container {
                margin-bottom: 6px;
            }
            .thread-label {
                display: inline-block;
                word-break: break-word;
                max-width: calc(100% - 30px);
                vertical-align: top;
                line-height: 1.4;
                margin-left: 5px;
            }
            .thread-selector {
                width: 100%;
                padding: 5px;
                box-sizing: border-box;
            }
            .thread-selector-form, .style-selector-form {
                margin: 5px 0;
            }
        `;
        document.head.appendChild(style);
        
        // Get keys from dataMap
        const threadKeys = Object.keys(this.dataMap);
        
        // Create radio buttons for each thread
        threadKeys.forEach((key, index) => {
            const radioContainer = document.createElement('div');
            radioContainer.className = 'radio-container';
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = `thread-${key}`;
            radioInput.name = 'thread-selection';
            radioInput.style.cursor = "pointer";
            radioInput.value = key;
            radioInput.style.verticalAlign = 'top';
            
            // Make the first option selected by default
            if (index === 0) {
                radioInput.checked = true;
            }
            
            // Add event listener
            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    const newData = this.dataMap[key];
                    this.renderer.updateData(newData, true); // resetZoomAfterUpdate = true
                }
            });
            
            const label = document.createElement('label');
            label.htmlFor = `thread-${key}`;
            label.textContent = key;
            label.className = 'thread-label';
            label.style.cursor = "pointer";
            
            radioContainer.appendChild(radioInput);
            radioContainer.appendChild(label);
            form.appendChild(radioContainer);
        });
        
        selectorContainer.appendChild(form);
        this.container.appendChild(selectorContainer);
        
        // Initialize with the first thread if available
        if (threadKeys.length > 0) {
            const firstKey = threadKeys[0];
            // Set a small timeout to ensure the UI is fully created before updating
            setTimeout(() => {
                this.renderer.updateData(this.dataMap[firstKey], true);
            }, 10);
        }
    }


    createFlameWidthStyleSelectorUI() {
        const styleContainer = document.createElement('div');
        styleContainer.className = 'style-selector';
        
        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Flame Graph Style';
        styleContainer.appendChild(header);
        
        // Create form for radio buttons
        const form = document.createElement('form');
        form.className = 'style-selector-form';
        
        // Define style options
        const styleOptions = [
            { id: 'logical', text: 'Logical', value: true, description: 'Ignores time information, focuses on method call relationships' },
            { id: 'temporal', text: 'Temporal', value: false, description: 'Sets block widths based on actual time usage' }
        ];
        
        // Create radio buttons for each style
        styleOptions.forEach((option, index) => {
            const radioContainer = document.createElement('div');
            radioContainer.className = 'radio-container';
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.id = `style-${option.id}`;
            radioInput.name = 'style-selection';
            radioInput.value = option.id;
            radioInput.checked = option.id === 'logical'; // Logical is selected by default
            radioInput.style.verticalAlign = 'top';
            radioInput.style.cursor = "pointer";
            
            // Add event listener
            radioInput.addEventListener('change', () => {
                if (radioInput.checked) {
                    this.renderer.switchWidthMode(option.value);
                }
            });
            
            // Create label with description
            const labelContainer = document.createElement('div');
            labelContainer.className = 'label-container';
            
            const label = document.createElement('label');
            label.htmlFor = `style-${option.id}`;
            label.textContent = option.text;
            label.className = 'style-label';
            label.style.cursor = "pointer";
            
            labelContainer.appendChild(label);
            
            // Add description text
            const description = document.createElement('div');
            description.className = 'style-description';
            description.textContent = option.description;
            labelContainer.appendChild(description);
            
            radioContainer.appendChild(radioInput);
            radioContainer.appendChild(labelContainer);
            form.appendChild(radioContainer);
        });
        
        // Add some styling
        const style = document.createElement('style');
        style.textContent = `
            .style-selector {
                margin-top: 10px;
                padding: 5px;
                border-top: 1px solid #eee;
            }
            .style-description {
                font-size: 12px;
                color: #666;
                margin-left: 5px;
                margin-top: 2px;
            }
            .label-container {
                display: inline-block;
                vertical-align: top;
                margin-left: 5px;
                max-width: calc(100% - 30px);
            }
            .style-label {
                font-weight: bold;
            }

        `;
        document.head.appendChild(style);
        
        styleContainer.appendChild(form);
        this.container.appendChild(styleContainer);
        
        // Set the initial style (logical by default)
        this.renderer.switchWidthMode(true);
    }
}