/**
 * Handles playback timing and state management
 */
export class PlaybackManager {
    constructor() {
        this.currentPlayingThread = null;
        this.playInterval = null;
        this.playbackSpeed = 500; // ms between steps
    }

    isPlaying(threadName) {
        return this.currentPlayingThread === threadName;
    }

    startPlayback(threadName, onStep, onComplete) {
        this.stopPlayback();
        
        this.playInterval = setInterval(() => {
            const shouldContinue = onStep();
            if (!shouldContinue) {
                this.stopPlayback();
                onComplete();
            }
        }, this.playbackSpeed);

        this.currentPlayingThread = threadName;
    }

    stopPlayback() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.currentPlayingThread = null;
    }

    togglePlayback(threadName, onStep, onComplete) {
        if (this.isPlaying(threadName)) {
            this.stopPlayback();
            return false; // stopped
        } else {
            this.startPlayback(threadName, onStep, onComplete);
            return true; // started
        }
    }
}