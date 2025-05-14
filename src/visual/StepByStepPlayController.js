/**
 * Creates a step-by-step play component for controlling call tree visualization
 * Auto-initializes on the #stepByStepPlay container element
 */
export class StepByStepPlayController {
    constructor(eventBus, dataStore, classvizManager, containerSelector = '#stepByStepPlay') {
        this.data = dataStore;
        this.eventBus = eventBus;
        this.classvizManager = classvizManager;
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`Container element not found: ${containerSelector}`);
            return;
        }
        this.players = [];

        // Set fixed width for the container to match sidebar
        this.container.style.width = '270px';
        this.container.style.maxWidth = '100%';
        this.container.style.boxSizing = 'border-box';

        this.init();

        this.eventBus.subscribe('changeClassvizFocus', () => {
            this.refresh();
            this.onModeToggle(this.classvizManager.stepByStepMode);
        });

        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', () => {
            this.refresh();
            this.onModeToggle(this.classvizManager.stepByStepMode);
        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', () => {
            this.refresh();
            this.onModeToggle(this.classvizManager.stepByStepMode);
        });
    }

    init() {
        // Clear container
        this.container.innerHTML = '';

        // Create mode toggle button at the top - even more compact
        this.createModeToggle();

        const threadNames = Array.from(this.classvizManager.threadToMethodNodesInOrder.keys());

        // Create player for each thread
        threadNames.forEach(threadName => {
            const methodNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName) || [];
            const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
            const maxIndex = methodNodes.length - 1;

            this.createPlayerUI(threadName, methodNodes, currentIndex, maxIndex);
        });
    }

    createModeToggle() {
        const toggleContainer = document.createElement('div');
        toggleContainer.style.display = 'flex';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.justifyContent = 'space-between';
        toggleContainer.style.marginBottom = '10px';
        toggleContainer.style.padding = '0 1px 0 0';

        // Toggle label
        const toggleLabel = document.createElement('div');
        toggleLabel.textContent = 'Enable step-by-step mode';
        toggleLabel.style.fontWeight = 'normal';
        toggleLabel.style.fontSize = '14px';
        toggleContainer.appendChild(toggleLabel);

        // Simple toggle switch
        const toggleSwitch = document.createElement('label');
        toggleSwitch.className = 'toggle-switch';
        toggleSwitch.style.position = 'relative';
        toggleSwitch.style.display = 'inline-block';
        toggleSwitch.style.width = '32px';
        toggleSwitch.style.height = '16px';
        toggleSwitch.style.right = '5px';
        toggleSwitch.style.cursor = 'pointer';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = this.classvizManager.stepByStepMode || false;
        toggleInput.style.opacity = '0';
        toggleInput.style.width = '0';
        toggleInput.style.height = '0';

        const toggleSlider = document.createElement('span');
        toggleSlider.style.position = 'absolute';
        toggleSlider.style.cursor = 'pointer';
        toggleSlider.style.top = '0';
        toggleSlider.style.left = '0';
        toggleSlider.style.right = '0';
        toggleSlider.style.bottom = '0';
        toggleSlider.style.backgroundColor = toggleInput.checked ? '#337ab7' : '#d1d5db';
        toggleSlider.style.transition = '.3s';
        toggleSlider.style.borderRadius = '8px';

        // Create the slider button
        const sliderButton = document.createElement('span');
        sliderButton.style.position = 'absolute';
        sliderButton.style.content = '""';
        sliderButton.style.height = '12px';
        sliderButton.style.width = '12px';
        sliderButton.style.left = toggleInput.checked ? '18px' : '2px';
        sliderButton.style.top = '2px';
        sliderButton.style.backgroundColor = 'white';
        sliderButton.style.transition = '.3s';
        sliderButton.style.borderRadius = '50%';
        toggleSlider.appendChild(sliderButton);

        // Add event listener for toggle
        toggleInput.addEventListener('change', () => {
            // Update the visual state
            toggleSlider.style.backgroundColor = toggleInput.checked ? '#337ab7' : '#d1d5db';
            sliderButton.style.left = toggleInput.checked ? '18px' : '2px';

            // Update the ClassvizManager state
            this.classvizManager.stepByStepMode = toggleInput.checked;

            // Call the toggle callback if provided
            if (this.onModeToggle) {
                this.onModeToggle(toggleInput.checked);
            }
        });

        toggleSwitch.appendChild(toggleInput);
        toggleSwitch.appendChild(toggleSlider);
        toggleContainer.appendChild(toggleSwitch);

        this.container.appendChild(toggleContainer);

        // Save references
        this.modeToggleInput = toggleInput;
    }

    createPlayerUI(threadName, methodNodes, currentIndex, maxIndex) {
        const threadPlayer = document.createElement('div');
        threadPlayer.className = 'thread-player';
        threadPlayer.style.marginBottom = '10px';
        threadPlayer.style.padding = '8px';
        threadPlayer.style.backgroundColor = '#f5f5f5';
        threadPlayer.style.borderRadius = '4px';

        // 获取这个线程的边框颜色
        const borderColour = this.classvizManager.threadToFocusedBorderColour.get(threadName);

        // Thread title container - make it a flex container
        const threadTitleContainer = document.createElement('div');
        threadTitleContainer.style.display = 'flex';
        threadTitleContainer.style.alignItems = 'center';
        threadTitleContainer.style.marginBottom = '6px';

        // Create the color dot for thread
        const colorDot = document.createElement('div');
        colorDot.style.width = '10px';
        colorDot.style.height = '10px';
        colorDot.style.borderRadius = '50%';
        colorDot.style.backgroundColor = borderColour || '#ccc'; // Use thread color or fallback to gray
        colorDot.style.marginRight = '8px';
        colorDot.style.flexShrink = '0'; // Prevent the dot from shrinking
        threadTitleContainer.appendChild(colorDot);

        // Thread title text
        const threadTitle = document.createElement('div');
        threadTitle.textContent = threadName;
        threadTitle.title = threadName; // Show full name on hover
        threadTitle.style.fontWeight = 'normal';
        threadTitle.style.fontSize = '13px';
        threadTitle.style.width = '210px'; // Slightly reduced to accommodate the dot
        threadTitle.style.overflow = 'hidden';
        threadTitle.style.textOverflow = 'ellipsis';
        threadTitle.style.whiteSpace = 'nowrap';
        threadTitleContainer.appendChild(threadTitle);

        threadPlayer.appendChild(threadTitleContainer);

        // Controls row
        const controlsRow = document.createElement('div');
        controlsRow.style.display = 'flex';
        controlsRow.style.alignItems = 'center';
        controlsRow.style.justifyContent = 'space-between';
        controlsRow.style.marginBottom = '6px';

        // Skip to start button
        const skipStartBtn = this.createButton('⏮', () => this.skipToStart(threadName));
        skipStartBtn.style.width = '26px';
        skipStartBtn.style.height = '26px';
        skipStartBtn.style.fontSize = '10px';
        controlsRow.appendChild(skipStartBtn);

        // Step back button
        const stepBackBtn = this.createButton('◀', () => this.stepBack(threadName));
        stepBackBtn.style.width = '26px';
        stepBackBtn.style.height = '26px';
        stepBackBtn.style.fontSize = '10px';
        controlsRow.appendChild(stepBackBtn);

        // Method display
        const methodDisplay = document.createElement('div');
        methodDisplay.className = 'method-display';
        methodDisplay.style.flex = '1';
        methodDisplay.style.margin = '0 6px';
        methodDisplay.style.padding = '3px 1px';
        methodDisplay.style.backgroundColor = '#f0f0f0';
        methodDisplay.style.borderRadius = '4px';
        methodDisplay.style.textAlign = 'center';
        methodDisplay.style.maxWidth = '110px'; // Fixed width for 260px sidebar
        methodDisplay.style.overflow = 'hidden';
        methodDisplay.style.whiteSpace = 'nowrap';
        methodDisplay.style.textOverflow = 'ellipsis';
        methodDisplay.style.fontSize = '10px';

        const currentMethod = methodNodes[currentIndex] || { label: 'None' };
        methodDisplay.textContent = this.extractClassAndMethod(currentMethod.label);
        methodDisplay.title = currentMethod.label; // Show full name on hover
        methodDisplay.dataset.threadName = threadName;

        controlsRow.appendChild(methodDisplay);

        // Step forward button
        const stepForwardBtn = this.createButton('▶', () => this.stepForward(threadName));
        stepForwardBtn.style.width = '26px';
        stepForwardBtn.style.height = '26px';
        stepForwardBtn.style.fontSize = '10px';
        controlsRow.appendChild(stepForwardBtn);

        // Skip to end button
        const skipEndBtn = this.createButton('⏭', () => this.skipToEnd(threadName, maxIndex));
        skipEndBtn.style.width = '26px';
        skipEndBtn.style.height = '26px';
        skipEndBtn.style.fontSize = '10px';
        controlsRow.appendChild(skipEndBtn);

        threadPlayer.appendChild(controlsRow);

        // Slider row
        const sliderRow = document.createElement('div');
        sliderRow.style.display = 'flex';
        sliderRow.style.alignItems = 'center';

        // Min label
        const minLabel = document.createElement('span');
        minLabel.textContent = '0';
        minLabel.style.marginRight = '4px';
        minLabel.style.fontSize = '10px';
        sliderRow.appendChild(minLabel);

        // Slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = maxIndex;
        slider.value = currentIndex;
        slider.style.flex = '1';
        slider.style.height = '4px'; // Smaller slider
        slider.dataset.threadName = threadName;

        slider.addEventListener('input', (event) => {
            const newIndex = parseInt(event.target.value);
            this.updateIndex(threadName, newIndex);
        });

        sliderRow.appendChild(slider);

        // Max label
        const maxLabel = document.createElement('span');
        maxLabel.textContent = maxIndex;
        maxLabel.style.marginLeft = '4px';
        maxLabel.style.fontSize = '10px';
        sliderRow.appendChild(maxLabel);

        threadPlayer.appendChild(sliderRow);

        // Counter display - made smaller
        const counterDisplay = document.createElement('div');
        counterDisplay.textContent = `${currentIndex + 1} / ${maxIndex + 1}`;
        counterDisplay.style.textAlign = 'right';
        counterDisplay.style.fontSize = '10px';
        counterDisplay.style.color = '#6b7280';
        counterDisplay.style.marginTop = '2px';
        counterDisplay.dataset.threadName = threadName;

        threadPlayer.appendChild(counterDisplay);

        // Add to container
        this.container.appendChild(threadPlayer);

        // Store references to update later
        this.players.push({
            threadName,
            elements: {
                methodDisplay,
                colorDot,        // Store reference to the color dot
                threadTitle,     // Store reference to thread title
                slider,
                counterDisplay
            }
        });
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.padding = '2px';
        button.style.backgroundColor = '#f0f0f0';
        button.style.borderRadius = '50%';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.width = '26px';
        button.style.height = '26px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.fontSize = '10px';

        button.addEventListener('click', onClick);
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#e5e7eb';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#f0f0f0';
        });

        return button;
    }

    // Control methods
    stepBack(threadName) {
        const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
        if (currentIndex > 0) {
            this.updateIndex(threadName, currentIndex - 1);
        }
    }

    stepForward(threadName) {
        const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
        const methodNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName) || [];
        const maxIndex = methodNodes.length - 1;

        if (currentIndex < maxIndex) {
            this.updateIndex(threadName, currentIndex + 1);
        }
    }

    skipToStart(threadName) {
        this.updateIndex(threadName, 0);
    }

    skipToEnd(threadName, maxIndex) {
        this.updateIndex(threadName, maxIndex);
    }

    updateIndex(threadName, newIndex) {
        this.classvizManager.currentIndexByThread.set(threadName, newIndex);
        const borderColour = this.classvizManager.threadToFocusedBorderColour.get(threadName);

        // Get the list of nodes in the thread
        const threadNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName);

        if (this.classvizManager.stepByStepMode) {
            // Iterate through all nodes in the thread
            threadNodes.forEach((node, index) => {
                const nodeId = node.originalId;

                // 使用全局节点映射获取节点数据，不受当前活跃线程影响
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);
                // Update
                if (nodeData) {
                    // Set color based on index relative to newIndex
                    if (index < newIndex) {
                        // For nodes before current position, set slightly dark gray
                        this.classvizManager.changeColorOfNodeById(nodeId, '#999999', false); // Slightly darker gray
                    } else if (index > newIndex) {
                        if (threadNodes[newIndex] && threadNodes[newIndex].label === node.label)
                            return;
                        // For nodes after current position, set light gray
                        this.classvizManager.changeColorOfNodeById(nodeId, '#DDDDDD', false); // Light gray
                    } else {
                        // For the current node, use original color
                        this.classvizManager.changeColorOfNodeById(nodeId, nodeData.originalColor || nodeData.color, true, borderColour);
                    }
                } else {
                    console.log("[Error no data]")
                }
            });
        }

        if (newIndex >= threadNodes.length) {
            console.error("Invalid index for thread nodes: ", newIndex);
            this.classvizManager.currentIndexByThread.set(threadName, threadNodes.length === 0 ? 0 : threadNodes.length - 1);
            return;
        }
        // Set current node with bounds check
        if (newIndex < 0) {
            console.error("Invalid index for thread nodes: ", newIndex);
            this.classvizManager.currentIndexByThread.set(threadName, 0);
            return;
        }
        const currentNodeId = threadNodes[newIndex].originalId;
        this.data.current = currentNodeId;

        this.eventBus.publish('changeCurrentFocusedNode', { nodeId: currentNodeId });

        this.refresh();
    }

    onModeToggle(on) {
        this.classvizManager.stepByStepMode = on;
        if (!on) {
            // When step-by-step mode is turned off, reset all thread nodes to their original colors
            for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
                nodes.forEach(node => {
                    const nodeId = node.originalId;

                    // 使用全局节点映射获取节点数据，不受当前活跃线程影响
                    const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);

                    if (nodeData) {
                        // Always restore using the originalColor property
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            nodeData.originalColor || nodeData.color,
                            false
                        );
                    }
                });
            }
        } else {
            // When turned on, immediately apply the step-by-step coloring to the current thread
            // First, get all thread entries
            const threadEntries = Array.from(this.classvizManager.currentIndexByThread.entries());

            // Get the current thread name
            const currentThreadName = this.data.currentThreadName;

            // Reorder the thread entries so the current thread is processed last
            let reorderedThreadEntries = threadEntries.filter(([threadName]) => threadName !== currentThreadName);

            // Find the current thread entry and add it to the end if it exists
            const currentThreadEntry = threadEntries.find(([threadName]) => threadName === currentThreadName);
            if (currentThreadEntry) {
                reorderedThreadEntries.push(currentThreadEntry);
            }

            // Process each thread, with the current thread at the end
            for (const [threadName, currentIndex] of reorderedThreadEntries) {
                if (currentIndex !== undefined) {
                    this.updateIndex(threadName, currentIndex);
                }
            }
        }
    }
    // Public API
    refresh() {
        this.init();
    }

    // Public methods to turn step-by-step mode on/off
    enableStepByStepMode() {
        if (this.modeToggleInput && !this.modeToggleInput.checked) {
            this.modeToggleInput.checked = true;

            // Trigger the change event manually
            const event = new Event('change');
            this.modeToggleInput.dispatchEvent(event);
        }
    }

    disableStepByStepMode() {
        if (this.modeToggleInput && this.modeToggleInput.checked) {
            this.modeToggleInput.checked = false;

            // Trigger the change event manually
            const event = new Event('change');
            this.modeToggleInput.dispatchEvent(event);
        }
    }

    extractClassAndMethod(str) {
        const parts = str.split('.');
        const className = parts[parts.length - 2];
        const methodName = parts[parts.length - 1];
        if (!className) {
            return "None";
        }
        return `${className}.${methodName}`;
    }
}