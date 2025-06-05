// FlameGraphEventHandler.js - Handles all event-related logic
export class FlameGraphEventHandler {
    constructor(eventBus, flameGraphRenderer) {
        this.eventBus = eventBus;
        this.renderer = flameGraphRenderer;
        this.subscriptions = new Map();
        this._resizeTimer = null;
        
        this.init();
    }

    init() {
        this.subscribeToEvents();
        this.setupWindowEvents();
    }

    subscribeToEvents() {
        if (!this.eventBus) return;

        const events = {
            'viewModeChanged': (data) => this.handleViewModeChange(data),
            'threadChanged': () => this.renderer.update(),
            'refreshFlame': () => this.renderer.update(),
            'changeLogicalStyle': () => this.renderer.update(),
            'nodeStructureChanged': () => this.renderer.update()
        };

        Object.entries(events).forEach(([event, handler]) => {
            this.eventBus.subscribe(event, handler);
            this.subscriptions.set(event, handler);
        });
    }

    setupWindowEvents() {
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    handleViewModeChange(data) {
        if (data.mode === 'flameGraph') {
            this.renderer.show();
        } else {
            this.renderer.hide();
        }
    }

    handleResize() {
        if (this._resizeTimer) clearTimeout(this._resizeTimer);

        this._resizeTimer = setTimeout(() => {
            const flameGraphEl = document.querySelector('#flameGraph');
            if (flameGraphEl && flameGraphEl.style.display !== 'none') {
                this.renderer.update();
            }
        }, 250);
    }

    publishEvent(eventName, data) {
        if (this.eventBus) {
            this.eventBus.publish(eventName, data);
        }
    }

    destroy() {
        // Unsubscribe from all events
        this.subscriptions.forEach((handler, event) => {
            if (this.eventBus) {
                this.eventBus.unsubscribe(event, handler);
            }
        });
        this.subscriptions.clear();

        // Remove window event listeners
        window.removeEventListener('resize', this.handleResize);
        
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
        }
    }
}