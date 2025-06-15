import { PlaybackManager } from "./stepByStep/PlaybackManager.js";
import { StepByStepUIBuilder } from "./stepByStep/StepByStepUIBuilder.js";
import { ThreadStateManager } from "./stepByStep/ThreadStateManager.js";

export class StepByStepPlayController {
    constructor(eventBus, dataStore, classvizManager, containerSelector = '#stepByStepPlay') {
        this.eventBus = eventBus;
        this.dataStore = dataStore;
        this.classvizManager = classvizManager;
        
        this.uiBuilder = new StepByStepUIBuilder(containerSelector);
        this.playbackManager = new PlaybackManager();
        this.threadStateManager = new ThreadStateManager(classvizManager, dataStore);
        
        this.modeToggleInput = null;
        
        this.init();
        this._setupEventListeners();
    }

    init() {
        // Store current playing state
        const wasPlaying = this.playbackManager.currentPlayingThread;
        
        // Stop and clear
        this.playbackManager.stopPlayback();
        this.uiBuilder.clear();

        // Create mode toggle
        this.modeToggleInput = this.uiBuilder.createModeToggle(
            this.classvizManager.stepByStepMode || false,
            (enabled) => this._handleModeToggle(enabled)
        );

        // Create player for each thread with nodes
        const threadNames = this.threadStateManager.getAllThreadNames();
        threadNames.forEach(threadName => {
            const threadData = this.threadStateManager.getThreadData(threadName);
            
            if (threadData.methodNodes.length === 0) return;

            const callbacks = this._createThreadCallbacks(threadName);
            this.uiBuilder.createPlayerCard(threadData, callbacks);
        });

        // Restore playing state
        if (wasPlaying) {
            this._startThreadPlayback(wasPlaying);
        }
    }

    _createThreadCallbacks(threadName) {
        return {
            onSkipStart: () => this._updateThreadIndex(threadName, 0),
            onStepBack: () => this._stepThread(threadName, -1),
            onTogglePlay: () => this._toggleThreadPlayback(threadName),
            onStepForward: () => this._stepThread(threadName, 1),
            onSkipEnd: () => {
                const threadData = this.threadStateManager.getThreadData(threadName);
                this._updateThreadIndex(threadName, threadData.maxIndex);
            },
            onSliderChange: (newIndex) => this._updateThreadIndex(threadName, newIndex)
        };
    }

    _stepThread(threadName, direction) {
        const threadData = this.threadStateManager.getThreadData(threadName);
        const newIndex = threadData.currentIndex + direction;
        this._updateThreadIndex(threadName, newIndex);
    }

    _updateThreadIndex(threadName, newIndex) {
        this.playbackManager.stopPlayback();
        
        if (this.threadStateManager.updateThreadIndex(threadName, newIndex)) {
            this.eventBus.publish('changeCurrentFocusedNode', { 
                nodeId: this.dataStore.current 
            });
            this.refresh();
        }
    }

    _toggleThreadPlayback(threadName) {
        const isNowPlaying = this.playbackManager.togglePlayback(
            threadName,
            () => this._playbackStep(threadName),
            () => console.log(`Playback completed for thread: ${threadName}`)
        );
        
        this.uiBuilder.updatePlayButton(threadName, isNowPlaying);
    }

    _startThreadPlayback(threadName) {
        this.playbackManager.startPlayback(
            threadName,
            () => this._playbackStep(threadName),
            () => console.log(`Playback completed for thread: ${threadName}`)
        );
        this.uiBuilder.updatePlayButton(threadName, true);
    }

    _playbackStep(threadName) {
        const threadData = this.threadStateManager.getThreadData(threadName);
        const nextIndex = threadData.currentIndex + 1;
        
        if (nextIndex <= threadData.maxIndex) {
            this.threadStateManager.updateThreadIndex(threadName, nextIndex);
            this.eventBus.publish('changeCurrentFocusedNode', { 
                nodeId: this.dataStore.current 
            });
            this.refresh();
            return true; // Continue playback
        }
        
        this.uiBuilder.updatePlayButton(threadName, false);
        return false; // Stop playback
    }

    _handleModeToggle(enabled) {
        this.classvizManager.stepByStepMode = enabled;
        
        if (enabled) {
            this.eventBus.publish('stopRegionFocusMode');
            this._applyStepByStepMode();
        } else {
            this.playbackManager.stopPlayback();
            this.threadStateManager.resetAllThreadColors();
        }
    }

    _applyStepByStepMode() {
        const threadEntries = Array.from(this.classvizManager.currentIndexByThread.entries());
        const currentThreadName = this.dataStore.currentThreadName;

        // Process current thread last
        const reorderedEntries = threadEntries.filter(([name]) => name !== currentThreadName);
        const currentEntry = threadEntries.find(([name]) => name === currentThreadName);
        if (currentEntry) reorderedEntries.push(currentEntry);

        reorderedEntries.forEach(([threadName, currentIndex]) => {
            if (currentIndex !== undefined) {
                this.threadStateManager.updateThreadIndex(threadName, currentIndex);
            }
        });
    }

    _setupEventListeners() {
        const events = [
            'changeClassvizFocus',
            'changeSingleMethodByIdToClassviz',
            'changeMultiMethodByIdsToClassviz'
        ];

        events.forEach(event => {
            this.eventBus.subscribe(event, () => {
                this.refresh();
                this._handleModeToggle(this.classvizManager.stepByStepMode);
            });
        });

        this.eventBus.subscribe('switchStepByStepMode', ({ flag }) => {
            this.classvizManager.stepByStepMode = flag;
            this._handleModeToggle(flag);
        });

        this.eventBus.subscribe('stopStepByStepMode', () => {
            this.playbackManager.stopPlayback();
        });
    }

    // Public API
    refresh() {
        this.init();
    }

    enableStepByStepMode() {
        if (this.modeToggleInput && !this.modeToggleInput.checked) {
            this.modeToggleInput.checked = true;
            this.modeToggleInput.dispatchEvent(new Event('change'));
        }
    }

    disableStepByStepMode() {
        if (this.modeToggleInput && this.modeToggleInput.checked) {
            this.modeToggleInput.checked = false;
            this.modeToggleInput.dispatchEvent(new Event('change'));
        }
    }
}