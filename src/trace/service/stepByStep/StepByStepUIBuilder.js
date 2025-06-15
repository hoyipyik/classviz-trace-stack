/**
 * Handles UI creation and management for the step-by-step play component
 */
export class StepByStepUIBuilder {
    constructor(containerSelector = '#stepByStepPlay') {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`Container element not found: ${containerSelector}`);
        }
        this._initializeContainer();
    }

    _initializeContainer() {
        this.container.style.width = '270px';
        this.container.style.maxWidth = '100%';
        this.container.style.boxSizing = 'border-box';
    }

    clear() {
        this.container.innerHTML = '';
    }

    createModeToggle(isEnabled, onToggle) {
        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 0 1px 0 0;
        `;

        const toggleLabel = document.createElement('div');
        toggleLabel.textContent = 'Enable step-by-step mode';
        toggleLabel.style.cssText = 'font-weight: normal; font-size: 14px;';

        const toggleSwitch = this._createToggleSwitch(isEnabled, onToggle);
        
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(toggleSwitch);
        this.container.appendChild(toggleContainer);

        return toggleSwitch.querySelector('input');
    }

    _createToggleSwitch(isEnabled, onToggle) {
        const toggleSwitch = document.createElement('label');
        toggleSwitch.className = 'toggle-switch';
        toggleSwitch.style.cssText = `
            position: relative;
            display: inline-block;
            width: 32px;
            height: 16px;
            right: 5px;
            cursor: pointer;
        `;

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = isEnabled;
        toggleInput.style.cssText = 'opacity: 0; width: 0; height: 0;';

        const toggleSlider = this._createToggleSlider(isEnabled);
        
        toggleInput.addEventListener('change', () => {
            this._updateToggleVisual(toggleInput, toggleSlider);
            onToggle(toggleInput.checked);
        });

        toggleSwitch.appendChild(toggleInput);
        toggleSwitch.appendChild(toggleSlider);

        return toggleSwitch;
    }

    _createToggleSlider(isEnabled) {
        const toggleSlider = document.createElement('span');
        toggleSlider.style.cssText = `
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: ${isEnabled ? '#337ab7' : '#d1d5db'};
            transition: .3s;
            border-radius: 8px;
        `;

        const sliderButton = document.createElement('span');
        sliderButton.style.cssText = `
            position: absolute;
            height: 12px; width: 12px;
            left: ${isEnabled ? '18px' : '2px'};
            top: 2px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        `;

        toggleSlider.appendChild(sliderButton);
        return toggleSlider;
    }

    _updateToggleVisual(toggleInput, toggleSlider) {
        const sliderButton = toggleSlider.querySelector('span');
        toggleSlider.style.backgroundColor = toggleInput.checked ? '#337ab7' : '#d1d5db';
        sliderButton.style.left = toggleInput.checked ? '18px' : '2px';
    }

    createPlayerCard(threadData, callbacks) {
        const { threadName, borderColor, currentMethod, currentIndex, maxIndex } = threadData;
        const { onSkipStart, onStepBack, onTogglePlay, onStepForward, onSkipEnd, onSliderChange } = callbacks;

        const threadPlayer = document.createElement('div');
        threadPlayer.className = 'thread-player';
        threadPlayer.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
        `;

        // Thread title with color dot
        const titleContainer = this._createThreadTitle(threadName, borderColor);
        threadPlayer.appendChild(titleContainer);

        // Control buttons
        const controlsRow = this._createControlsRow(threadName, currentMethod, {
            onSkipStart, onStepBack, onTogglePlay, onStepForward, onSkipEnd
        });
        threadPlayer.appendChild(controlsRow);

        // Slider
        const sliderRow = this._createSliderRow(currentIndex, maxIndex, onSliderChange);
        threadPlayer.appendChild(sliderRow);

        // Counter
        const counterDisplay = this._createCounterDisplay(currentIndex, maxIndex);
        threadPlayer.appendChild(counterDisplay);

        this.container.appendChild(threadPlayer);
        return threadPlayer;
    }

    _createThreadTitle(threadName, borderColor) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 6px;
        `;

        const colorDot = document.createElement('div');
        colorDot.style.cssText = `
            width: 10px; height: 10px;
            border-radius: 50%;
            background-color: ${borderColor || '#ccc'};
            margin-right: 8px;
            flex-shrink: 0;
        `;

        const titleText = document.createElement('div');
        titleText.textContent = threadName;
        titleText.title = threadName;
        titleText.style.cssText = `
            font-weight: normal;
            font-size: 13px;
            width: 210px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;

        container.appendChild(colorDot);
        container.appendChild(titleText);
        return container;
    }

    _createControlsRow(threadName, currentMethod, callbacks) {
        const controlsRow = document.createElement('div');
        controlsRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        `;

        const buttons = [
            { text: '⏮', title: 'Jump to the first method in this trace', onClick: callbacks.onSkipStart },
            { text: '◀◀', title: 'Jump to the previous method', onClick: callbacks.onStepBack },
            { text: '▶', title: 'Auto play/pause, it will stop other playing trace', onClick: callbacks.onTogglePlay, isPlay: true },
            { text: '▶▶', title: 'Jump to next method', onClick: callbacks.onStepForward },
            { text: '⏭', title: 'Jump to the last method of this trace', onClick: callbacks.onSkipEnd }
        ];

        buttons.forEach(({ text, title, onClick, isPlay }) => {
            const button = this._createButton(text, title, onClick);
            if (isPlay) {
                button.style.backgroundColor = '#e8f4f8';
                button.id = `play-btn-${threadName.replace(/[^a-zA-Z0-9]/g, '-')}`;
            }
            controlsRow.appendChild(button);
        });

        // Method display in the middle
        const methodDisplay = this._createMethodDisplay(currentMethod);
        controlsRow.insertBefore(methodDisplay, controlsRow.children[3]);

        return controlsRow;
    }

    _createMethodDisplay(currentMethod) {
        const methodDisplay = document.createElement('div');
        methodDisplay.className = 'method-display';
        methodDisplay.style.cssText = `
            flex: 1;
            margin: 0 4px;
            padding: 3px 1px;
            background-color: #f0f0f0;
            border-radius: 4px;
            text-align: center;
            max-width: 90px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 10px;
        `;

        const displayText = this._extractClassAndMethod(currentMethod?.label || 'None');
        methodDisplay.textContent = displayText;
        methodDisplay.title = currentMethod?.label || 'None';

        return methodDisplay;
    }

    _createSliderRow(currentIndex, maxIndex, onSliderChange) {
        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display: flex; align-items: center;';

        const minLabel = document.createElement('span');
        minLabel.textContent = '0';
        minLabel.style.cssText = 'margin-right: 4px; font-size: 10px;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = maxIndex;
        slider.value = currentIndex;
        slider.style.cssText = 'flex: 1; height: 4px;';
        slider.addEventListener('input', (e) => onSliderChange(parseInt(e.target.value)));

        const maxLabel = document.createElement('span');
        maxLabel.textContent = maxIndex;
        maxLabel.style.cssText = 'margin-left: 4px; font-size: 10px;';

        sliderRow.appendChild(minLabel);
        sliderRow.appendChild(slider);
        sliderRow.appendChild(maxLabel);

        return sliderRow;
    }

    _createCounterDisplay(currentIndex, maxIndex) {
        const counter = document.createElement('div');
        counter.textContent = `${currentIndex + 1} / ${maxIndex + 1}`;
        counter.style.cssText = `
            text-align: right;
            font-size: 10px;
            color: #6b7280;
            margin-top: 2px;
        `;
        return counter;
    }

    _createButton(text, title, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
            padding: 2px;
            background-color: #f0f0f0;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            width: 24px; height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
        `;

        button.addEventListener('click', onClick);
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#e5e7eb';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = button.id?.startsWith('play-btn-') ? '#e8f4f8' : '#f0f0f0';
        });

        return button;
    }

    updatePlayButton(threadName, isPlaying) {
        const buttonId = `play-btn-${threadName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = isPlaying ? '⏸' : '▶';
            button.style.backgroundColor = '#e8f4f8';
        }
    }

    _extractClassAndMethod(str) {
        const parts = str.split('.');
        const className = parts[parts.length - 2];
        const methodName = parts[parts.length - 1];
        return className ? `${className}.${methodName}` : "None";
    }
}