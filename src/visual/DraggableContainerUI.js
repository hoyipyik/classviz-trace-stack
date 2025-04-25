class DraggableContainerUI{
    setupDraggableContainer() {
        const container = this.container;
        const dragHandle = document.getElementById('drag-handle');
    
        if (!container || !dragHandle) {
            console.warn("Could not find flame container or drag handle");
            return;
        }
    
        // Initialize container state - scrollable but minimized (hidden)
        container.style.display = 'flex';
        container.classList.add('scrollable');
        this.setContainerMinimized(); // Start with minimized state
    
        // Set up drag handle events
        this.setupDragHandleEvents(dragHandle);
    }
    
    setupDragHandleEvents(dragHandle) {
        // Set up double-click event
        dragHandle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.handleDragHandleDblClick();
        });
    
        // Variables for drag functionality
        const dragState = {
            isDragging: false,
            startY: 0,
            startHeight: 0
        };
    
        // Mouse down handler
        dragHandle.addEventListener('mousedown', (e) => {
            if (e.detail > 1) return; // Skip double-clicks
    
            e.preventDefault();
    
            dragState.isDragging = true;
            dragState.startY = e.clientY;
            dragState.startHeight = this.container.offsetHeight;
    
            this.container.style.transition = 'none';
    
            // Bind these handlers to preserve context
            const handleMove = this.handleDragMove.bind(this);
            const handleEnd = this.handleDragEnd.bind(this);
    
            // Use passive event listeners where appropriate
            document.addEventListener('mousemove', 
                (ev) => handleMove(ev, dragState),
                { passive: false });
            document.addEventListener('mouseup', 
                () => {
                    handleEnd(dragState);
                    // Clean up event listeners
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleEnd);
                });
        });
    }
    
    handleDragMove(ev, dragState) {
        if (!dragState.isDragging) return;
    
        ev.preventDefault();
    
        const deltaY = dragState.startY - ev.clientY;
        const maxHeight = window.innerHeight - 36;
    
        // Use requestAnimationFrame for smoother UI updates
        requestAnimationFrame(() => {
            // Update height within constraints
            const newHeight = Math.max(CONSTANTS.MIN_HEIGHT,
                Math.min(dragState.startHeight + deltaY, maxHeight));
            this.container.style.height = `${newHeight}px`;
        });
    }
    
    handleDragEnd(dragState) {
        if (!dragState.isDragging) return;
    
        dragState.isDragging = false;
        this.container.style.transition = '';
    
        // Determine final state
        const currentHeight = this.container.offsetHeight;
    
        if (currentHeight <= 50) {
            this.setContainerMinimized();
        } else {
            // If dragged to a custom height, keep that height
            // and just update the state
            this.containerState = CONSTANTS.STATES.EXPANDED;
            this.container.classList.add('active');
        }
    }
    
    handleDragHandleDblClick() {
        if (this.containerState === CONSTANTS.STATES.MINIMIZED) {
            // If minimized, expand to half height
            this.setContainerHalfExpand();
        } else if (this.containerState === CONSTANTS.STATES.EXPANDED) {
            const currentHeight = this.container.offsetHeight;
            if (currentHeight <= Math.ceil(window.innerHeight / 2)) {
                // If more than half height, set to half height
                this.setContainerMinimized();
            } else {
                // If at half height or less, minimize
                this.setContainerHalfExpand();
            }
        }
    }
    
    setContainerFullyExpand() {
        this.container.style.height = `${Math.floor(window.innerHeight)}px`;
        this.container.classList.add('active');
        this.containerState = CONSTANTS.STATES.EXPANDED;
    }
    
    setContainerHalfExpand() {
        this.container.style.height = `${Math.floor(window.innerHeight / 2)}px`;
        this.container.classList.add('active');
        this.containerState = CONSTANTS.STATES.EXPANDED;
    }
    
    setContainerMinimized() {
        this.container.style.height = `${CONSTANTS.MIN_HEIGHT}px`;
        this.container.classList.remove('active');
        // Always keep scrollable class
        this.containerState = CONSTANTS.STATES.MINIMIZED;
        this.container.scrollTop = 0;
    }
}