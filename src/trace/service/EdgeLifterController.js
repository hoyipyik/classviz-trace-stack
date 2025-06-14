export class EdgeLifterController {
    constructor(eventBus, classvizManager) {
        this.eventBus = eventBus;
        this.classvizManager = classvizManager;

        this.init();
    }

    init() {
        // Initialize the edge lifter
        this.setupLiftEdgesButton();
        this.eventBus.subscribe('refreshLiftEdges', ({ newLiftedEdgeMode }) => {
            this.classvizManager.liftedEdgesMode = newLiftedEdgeMode;
            const inputCheckbox = document.getElementById('liftEdges');
            inputCheckbox.checked = this.classvizManager.liftedEdgesMode;
            this.liftEdges(newLiftedEdgeMode, false);
        });
    }

    setupLiftEdgesButton() {
        const inputCheckbox = document.getElementById('liftEdges');
        inputCheckbox.checked = this.classvizManager.liftedEdgesMode;
        inputCheckbox.addEventListener('change', (event) => {
            this.liftEdges(event.target.checked);
        });
    }

    liftEdges(isChecked, stopFocusMode=true) {
        this.classvizManager.liftedEdgesMode = isChecked;

        if (isChecked) {
            this.classvizManager.liftEdges();
        } else {
            if (stopFocusMode) {
                this.eventBus.publish('stopRegionFocusModeAndRender');
            }
            this.classvizManager.switchTraceMode();
        }
    }
}