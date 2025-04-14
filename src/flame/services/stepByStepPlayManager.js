/**
 * StepByStepPlayManager - Manages step-by-step visualization of method calls
 * with playback controls and position tracking.
 */
export class StepByStepPlayManager {
    constructor(methodDisplayManager) {
        this.methodDisplayManager = methodDisplayManager;
        this.displayedMethodIds = this.methodDisplayManager.displayedMethodIds;
        this.cy = this.methodDisplayManager.cy;
        
        // Playback state
        this.currentPosition = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.playInterval = null;
        this.methodSequence = [];
        this.positionIndicator = null;
        
        // Default settings
        this.playbackSpeed = 1000; // ms between steps
        this.indicatorShape = 'ellipse';
        this.indicatorSize = 15;
    }

    /**
     * Initialize the method sequence for playback
     * @param {Array<string>} methodSequence - Array of method IDs in sequence order
     */
    setMethodSequence(methodSequence) {
        // Filter to ensure all methods exist
        this.methodSequence = methodSequence.filter(methodId => {
            const exists = this.cy.$id(methodId).length > 0;
            if (!exists) {
                console.warn(`Method node with ID "${methodId}" not found and will be skipped`);
            }
            return exists;
        });
        
        // Reset position
        this.currentPosition = -1;
        
        // Make all gray initially
        this.makeAllMethodsGray();
        
        return this;
    }
    
    /**
     * Set playback speed
     * @param {number} speedMs - Milliseconds between steps
     */
    setSpeed(speedMs) {
        this.playbackSpeed = speedMs;
        return this;
    }

    /**
     * Start auto playback of the method sequence
     * @returns {Promise} Resolves when playback completes or is stopped
     */
    async play() {
        if (this.isPlaying) {
            // Resume if paused
            if (this.isPaused) {
                this.isPaused = false;
                return this._continuePlayback();
            }
            return; // Already playing
        }
        
        if (this.methodSequence.length === 0) {
            console.warn("No method sequence set for playback");
            return;
        }
        
        // Initialize playback
        this.isPlaying = true;
        this.isPaused = false;
        this.makeAllMethodsGray();
        
        // Start from beginning if at end or not started
        if (this.currentPosition >= this.methodSequence.length - 1 || this.currentPosition < 0) {
            this.currentPosition = -1;
        }
        
        return this._continuePlayback();
    }
    
    /**
     * Internal method to handle playback
     * @private
     */
    async _continuePlayback() {
        return new Promise((resolve) => {
            this.playInterval = setInterval(() => {
                if (this.isPaused || !this.isPlaying) {
                    clearInterval(this.playInterval);
                    resolve();
                    return;
                }
                
                if (this.currentPosition >= this.methodSequence.length - 1) {
                    // End of sequence
                    this.stop();
                    resolve();
                    return;
                }
                
                this.next();
            }, this.playbackSpeed);
        });
    }
    
    /**
     * Pause playback
     */
    pause() {
        if (this.isPlaying) {
            this.isPaused = true;
            clearInterval(this.playInterval);
        }
        return this;
    }
    
    /**
     * Stop playback completely and reset
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        clearInterval(this.playInterval);
        this.removePositionIndicator();
        this.restoreAllMethodColors();
        return this;
    }
    
    /**
     * Move to next method in the sequence
     */
    next() {
        if (this.methodSequence.length === 0) {
            console.warn("No method sequence set");
            return this;
        }
        
        // Check if we're at the end
        if (this.currentPosition >= this.methodSequence.length - 1) {
            return this;
        }
        
        // Increment position
        this.currentPosition++;
        
        // Update visualization
        this._updateVisualization();
        
        return this;
    }
    
    /**
     * Move to previous method in the sequence
     */
    previous() {
        if (this.methodSequence.length === 0) {
            console.warn("No method sequence set");
            return this;
        }
        
        // Check if we're at the beginning
        if (this.currentPosition <= 0) {
            this.currentPosition = -1;
            this.makeAllMethodsGray();
            this.removePositionIndicator();
            return this;
        }
        
        // Decrement position
        this.currentPosition--;
        
        // Update visualization
        this._updateVisualization();
        
        return this;
    }
    
    /**
     * Jump to a specific position in the sequence
     * @param {number} position - Zero-based index in the sequence
     */
    jumpToPosition(position) {
        if (this.methodSequence.length === 0) {
            console.warn("No method sequence set");
            return this;
        }
        
        // Validate position
        if (position < 0) {
            this.currentPosition = -1;
            this.makeAllMethodsGray();
            this.removePositionIndicator();
            return this;
        }
        
        if (position >= this.methodSequence.length) {
            position = this.methodSequence.length - 1;
        }
        
        this.currentPosition = position;
        this._updateVisualization();
        
        return this;
    }
    
    /**
     * Update the visualization based on current position
     * @private
     */
    _updateVisualization() {
        // Make all methods gray first
        this.makeAllMethodsGray();
        
        if (this.currentPosition < 0 || this.currentPosition >= this.methodSequence.length) {
            this.removePositionIndicator();
            return;
        }
        
        // Get current method ID
        const currentMethodId = this.methodSequence[this.currentPosition];
        
        // Highlight current method
        this.restoreMethodColorById(currentMethodId);
        
        // Add/update position indicator
        this.updatePositionIndicator(currentMethodId);
    }
    
    /**
     * Create or update position indicator at the current method
     * @param {string} methodId - The method ID to place the indicator at
     */
    updatePositionIndicator(methodId) {
        const node = this.cy.$id(methodId);
        if (node.length === 0) return;
        
        // Remove existing indicator if any
        this.removePositionIndicator();
        
        // Get position from the method node
        const nodePosition = node.position();
        const nodeWidth = node.width();
        
        // Get the original color of the method node
        const nodeData = node.data();
        const methodColor = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        
        // Create indicator node
        this.positionIndicator = this.cy.add({
            group: 'nodes',
            data: { id: 'position-indicator', label: '' },
            position: { 
                x: nodePosition.x - (nodeWidth / 2) - (this.indicatorSize / 2) - 5, 
                y: nodePosition.y 
            }
        });
        
        // Style the indicator with the method's original color
        this.positionIndicator.style({
            'background-color': methodColor,
            'width': this.indicatorSize,
            'height': this.indicatorSize,
            'shape': this.indicatorShape,
            'border-width': 0,
            'text-opacity': 0,
            'z-index': 999
        });
    }
    
    /**
     * Remove the position indicator from the graph
     */
    removePositionIndicator() {
        if (this.positionIndicator) {
            this.cy.remove(this.positionIndicator);
            this.positionIndicator = null;
        }
    }

    /**
     * Make all method nodes background light gray
     */
    makeAllMethodsGray() {
        if (!this.cy) {
            console.warn("Invalid Cytoscape instance");
            return;
        }

        const methodIds = this.displayedMethodIds || [];
        methodIds.forEach(methodId => {
            const node = this.cy.$id(methodId);
            if (node.length > 0) {
                node.style('background-color', '#D3D3D3');
            }
        });
    }

    /**
     * Restore all method nodes to their original background colors
     */
    restoreAllMethodColors() {
        if (!this.cy) {
            console.warn("Invalid Cytoscape instance");
            return;
        }

        const methodIds = this.displayedMethodIds || [];
        methodIds.forEach(methodId => {
            const node = this.cy.$id(methodId);
            if (node.length > 0) {
                const nodeData = node.data();
                const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
                node.style('background-color', color);
            }
        });
    }

    /**
     * Make a specific method node gray by its ID
     * @param {string} methodId - The ID of the method node to make gray
     */
    makeMethodGrayById(methodId) {
        if (!this.cy) {
            console.warn("Invalid Cytoscape instance");
            return;
        }

        const node = this.cy.$id(methodId);
        if (node.length > 0) {
            node.style('background-color', '#D3D3D3');
        } else {
            console.warn(`Method node with ID "${methodId}" not found`);
        }
    }

    /**
     * Restore a specific method node to its original background color by its ID
     * @param {string} methodId - The ID of the method node to restore
     */
    restoreMethodColorById(methodId) {
        if (!this.cy) {
            console.warn("Invalid Cytoscape instance");
            return;
        }

        const node = this.cy.$id(methodId);
        if (node.length > 0) {
            const nodeData = node.data();
            const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
            node.style('background-color', color);
        } else {
            console.warn(`Method node with ID "${methodId}" not found`);
        }
    }

    /**
     * Pulse a specific method node to draw attention to it
     * @param {string} methodId - The ID of the method to pulse
     * @param {number} pulseCount - Number of pulses
     * @param {number} pulseDuration - Duration of each pulse in milliseconds
     * @returns {Promise} Resolves when pulsing is complete
     */
    async pulseMethod(methodId, pulseCount = 3, pulseDuration = 300) {
        const node = this.cy.$id(methodId);
        if (node.length === 0) {
            console.warn(`Method node with ID "${methodId}" not found`);
            return;
        }
        
        const nodeData = node.data();
        const originalColor = nodeData.color || nodeData.nodeColor || '#D3D3D3';
        const pulseColor = '#FF5733'; // Bright orange
        
        for (let i = 0; i < pulseCount; i++) {
            // Change to pulse color
            node.style('background-color', pulseColor);
            await new Promise(resolve => setTimeout(resolve, pulseDuration));
            
            // Change back to original
            node.style('background-color', originalColor);
            if (i < pulseCount - 1) {
                await new Promise(resolve => setTimeout(resolve, pulseDuration));
            }
        }
    }
}