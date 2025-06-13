export class EdgeLifterController {
    constructor(eventBus, classvizManager) {
        this.eventBus = eventBus;
        this.classvizManager = classvizManager;
       
        this.init();
    }

    init() {
        // Initialize the edge lifter
        this.setupLiftEdgesButton();
    }

    setupLiftEdgesButton() {
        const inputCheckbox = document.getElementById('liftEdges');
        inputCheckbox.checked = this.classvizManager.liftedEdgesMode;
        inputCheckbox.addEventListener('change', (event) => {
            this.liftEdges(event.target.checked);
        });
    }

    liftEdges(isChecked) {
        this.classvizManager.liftedEdgesMode = isChecked;

        if(isChecked){
            this.classvizManager.liftEdges();
        }else{
           
            this.classvizManager.switchTraceMode();
        }
    }
}