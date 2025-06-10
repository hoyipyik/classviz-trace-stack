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

        this.currentPlayingThread = null; // Track which thread is currently playing
        this.playInterval = null; // Single interval for the currently playing thread

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
            //   this.onModeToggle(this.classvizManager.stepByStepMode);
        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', () => {
            this.refresh();
            //   this.onModeToggle(this.classvizManager.stepByStepMode);
        });

        this.eventBus.subscribe('switchStepByStepMode', ({ flag }) => {
            this.classvizManager.stepByStepMode = flag;
            this.onModeToggle(flag);
        });

        this.eventBus.subscribe('stopStepByStepMode', () => {
            this.classvizManager.stepByStepMode = false;
            this.onModeToggle(false);   
        })

    }

    init() {
        // Store current playing thread before clearing
        const wasPlaying = this.currentPlayingThread;

        // Stop current playback
        this.stopPlayback();
        this.container.innerHTML = '';

        // Create mode toggle button at the top
        this.createModeToggle();

        const threadNames = Array.from(this.classvizManager.threadToMethodNodesInOrder.keys());

        // Create player for each thread
        threadNames.forEach(threadName => {
            const methodNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName) || [];
            const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
            const maxIndex = methodNodes.length - 1;

            this.createPlayerUI(threadName, methodNodes, currentIndex, maxIndex);
        });

        // Restore playing thread if it was playing
        if (wasPlaying) {
            this.startPlayback(wasPlaying);
        }
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

        // Get border color for this thread
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
        colorDot.style.backgroundColor = borderColour || '#ccc';
        colorDot.style.marginRight = '8px';
        colorDot.style.flexShrink = '0';
        threadTitleContainer.appendChild(colorDot);

        // Thread title text
        const threadTitle = document.createElement('div');
        threadTitle.textContent = threadName;
        threadTitle.title = threadName;
        threadTitle.style.fontWeight = 'normal';
        threadTitle.style.fontSize = '13px';
        threadTitle.style.width = '210px';
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
        const skipStartBtn = this.createButton('⏮', 'Jump to the first method in this trace', () => this.skipToStart(threadName));
        controlsRow.appendChild(skipStartBtn);

        // Step back button
        const stepBackBtn = this.createButton('◀◀', 'Jump to the previous method', () => this.stepBack(threadName));
        controlsRow.appendChild(stepBackBtn);

        // Play/Pause button
        const playPauseBtn = this.createButton('▶', 'Auto play/pause, it will stop other playing trace', () => this.togglePlayback(threadName));
        playPauseBtn.style.backgroundColor = '#e8f4f8';
        playPauseBtn.id = `play-btn-${threadName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        controlsRow.appendChild(playPauseBtn);

        // Method display
        const methodDisplay = document.createElement('div');
        methodDisplay.className = 'method-display';
        methodDisplay.style.flex = '1';
        methodDisplay.style.margin = '0 4px';
        methodDisplay.style.padding = '3px 1px';
        methodDisplay.style.backgroundColor = '#f0f0f0';
        methodDisplay.style.borderRadius = '4px';
        methodDisplay.style.textAlign = 'center';
        methodDisplay.style.maxWidth = '90px';
        methodDisplay.style.overflow = 'hidden';
        methodDisplay.style.whiteSpace = 'nowrap';
        methodDisplay.style.textOverflow = 'ellipsis';
        methodDisplay.style.fontSize = '10px';

        const currentMethod = methodNodes[currentIndex] || { label: 'None' };
        methodDisplay.textContent = this.extractClassAndMethod(currentMethod.label);
        methodDisplay.title = currentMethod.label;

        controlsRow.appendChild(methodDisplay);

        // Step forward button
        const stepForwardBtn = this.createButton('▶▶', 'Jumpt to next method', () => this.stepForward(threadName));
        controlsRow.appendChild(stepForwardBtn);

        // Skip to end button
        const skipEndBtn = this.createButton('⏭', 'Jump to the last method of this trace', () => this.skipToEnd(threadName, maxIndex));
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
        slider.style.height = '4px';

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

        // Counter display
        const counterDisplay = document.createElement('div');
        counterDisplay.textContent = `${currentIndex + 1} / ${maxIndex + 1}`;
        counterDisplay.style.textAlign = 'right';
        counterDisplay.style.fontSize = '10px';
        counterDisplay.style.color = '#6b7280';
        counterDisplay.style.marginTop = '2px';

        threadPlayer.appendChild(counterDisplay);

        // Add to container
        this.container.appendChild(threadPlayer);
    }

    createButton(text, title, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.padding = '2px';
        button.style.backgroundColor = '#f0f0f0';
        button.style.borderRadius = '4px';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.style.width = '24px';
        button.style.height = '24px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.title = title;
        button.style.fontSize = '10px';

        button.addEventListener('click', onClick);
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#e5e7eb';
        });
        button.addEventListener('mouseout', () => {
            // Always return to blue background for play buttons, gray for others
            if (button.id && button.id.startsWith('play-btn-')) {
                button.style.backgroundColor = '#e8f4f8';
            } else {
                button.style.backgroundColor = '#f0f0f0';
            }
        });

        return button;
    }

    // Playback control methods
    togglePlayback(threadName) {
        if (this.currentPlayingThread === threadName) {
            // If this thread is playing, stop it
            this.stopPlayback();
        } else {
            // Stop any current playback and start this thread
            this.stopPlayback();
            this.startPlayback(threadName);
        }
    }

    startPlayback(threadName) {
        console.log(`Starting playback for thread: ${threadName}`);

        this.playInterval = setInterval(() => {
            const methodNodes = this.classvizManager.threadToMethodNodesInOrder.get(threadName) || [];
            const currentIndex = this.classvizManager.currentIndexByThread.get(threadName) || 0;
            const maxIndex = methodNodes.length - 1;

            if (currentIndex < maxIndex) {
                this.stepForward(threadName);
            } else {
                // Reached the end, stop playback
                console.log(`Reached end for thread: ${threadName}`);
                this.stopPlayback();
            }
        }, 500);

        this.currentPlayingThread = threadName;
        this.updatePlayPauseButton(threadName, true);
    }

    stopPlayback() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }

        if (this.currentPlayingThread) {
            this.updatePlayPauseButton(this.currentPlayingThread, false);
            this.currentPlayingThread = null;
        }
    }

    updatePlayPauseButton(threadName, isPlaying) {
        const buttonId = `play-btn-${threadName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const button = document.getElementById(buttonId);

        if (button) {
            button.textContent = isPlaying ? '⏸' : '▶';
            button.style.backgroundColor = '#e8f4f8';
        }
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
        this.stopPlayback(); // Stop playback when jumping
        this.updateIndex(threadName, 0);
    }

    skipToEnd(threadName, maxIndex) {
        this.stopPlayback(); // Stop playback when jumping
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

                // Use global node mapping to get node data
                const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);
                if (nodeData) {
                    // Set color based on index relative to newIndex
                    if (index < newIndex) {
                        // For nodes before current position, set slightly dark gray
                        this.classvizManager.changeColorOfNodeById(nodeId, '#999999', true, nodeData.originalColor);
                    } else if (index > newIndex) {
                        if (threadNodes[newIndex] && threadNodes[newIndex].label === node.label)
                            return;
                        // For nodes after current position, set light gray
                        this.classvizManager.changeColorOfNodeById(nodeId, '#DDDDDD', true, nodeData.originalColor);
                    } else {
                        // For the current node, use original color
                        this.classvizManager.changeColorOfNodeById(nodeId, borderColour, true, nodeData.originalColor);
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
            // Stop all playback when step-by-step mode is turned off
            this.stopPlayback();

            // Reset all thread nodes to their original colors
            for (const [threadName, nodes] of this.classvizManager.threadToMethodNodesInOrder.entries()) {
                nodes.forEach(node => {
                    const nodeId = node.originalId;
                    const nodeData = this.data.getNodeDataByThreadAndId(threadName, nodeId);

                    if (nodeData) {
                        this.classvizManager.changeColorOfNodeById(
                            nodeId,
                            nodeData.originalColor || nodeData.color,
                            false
                        );
                    }
                });
            }
        } else {
            this.eventBus.publish('stopRegionFocusMode');
            // When turned on, apply step-by-step coloring
            const threadEntries = Array.from(this.classvizManager.currentIndexByThread.entries());
            const currentThreadName = this.data.currentThreadName;

            // Process current thread last
            let reorderedThreadEntries = threadEntries.filter(([threadName]) => threadName !== currentThreadName);
            const currentThreadEntry = threadEntries.find(([threadName]) => threadName === currentThreadName);
            if (currentThreadEntry) {
                reorderedThreadEntries.push(currentThreadEntry);
            }

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
            const event = new Event('change');
            this.modeToggleInput.dispatchEvent(event);
        }
    }

    disableStepByStepMode() {
        if (this.modeToggleInput && this.modeToggleInput.checked) {
            this.modeToggleInput.checked = false;
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