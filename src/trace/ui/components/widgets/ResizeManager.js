// Simple ResizeManager.js - Handles panel resizing with minimal code

export const relayoutWithBottomSpace = function (pCy=window.cy, layout="klay") {
	if (!pCy) {
		console.error('Cytoscape instance not found');
		return;
	}

	const windowHeight = window.innerHeight;
	const windowWidth = window.innerWidth;
	
	// 使用window高度的65%作为布局区域，底部保留35%
	const boundingBox = {
		x1: 0,
		y1: 0.35,
		x2: windowWidth,
		y2: windowHeight
	};

	console.log(`Relayout: window ${windowWidth}x${windowHeight}, boundingBox height: ${windowHeight * 0.65}`);

	pCy.$().layout({
		name: layout,
		animate: true,
		nodeDimensionsIncludeLabels: true,
		boundingBox: boundingBox,
		klay: {
			direction: "DOWN",
			edgeRouting: "ORTHOGONAL",
			routeSelfLoopInside: true,
			thoroughness: 4,
			spacing: 32,
		},
	}).run();
};

export class ResizeManager {
  constructor() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      setTimeout(() => this.init(), 100);
    }
  }

  init() {
    // Get references to elements
    this.handlerBar = document.getElementById('handlerBar');
    this.mainContent = document.getElementById('mainContent');
    
    if (!this.handlerBar || !this.mainContent) {
      console.error('Cannot find handlerBar or mainContent elements');
      return;
    }
    
    // Reset container styles first to prevent accumulation
    this.resetContainer();
    
    // Store the maximum height
    this.maxHeight = this.mainContent.scrollHeight || this.mainContent.clientHeight;
    // Define the minimum height
    this.minHeight = 11;
    
    // Set initial state to minimized
    requestAnimationFrame(() => {
      this.mainContent.style.height = `${this.minHeight}px`;
      this.mainContent.style.marginTop = `${this.maxHeight - this.minHeight}px`;
    });
    
    // Variables to track dragging state
    this.isResizing = false;
    this.startY = 0;
    this.startHeight = 0;
    this.startMarginTop = 0;
    
    // Remove any existing event listeners before adding new ones
    this.removeEventListeners();
    
    // Setup event listeners
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onDoubleClickBound = this.onDoubleClick.bind(this);
    
    this.handlerBar.addEventListener('mousedown', this.onMouseDownBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('mouseup', this.onMouseUpBound);
    this.handlerBar.addEventListener('dblclick', this.onDoubleClickBound);
    
    this.bindSidebarControlButtons();
  }

  resetContainer() {
    if (!this.mainContent) return;
    
    // Reset all inline styles that might have been set
    this.mainContent.style.height = '';
    this.mainContent.style.marginTop = '';
    this.mainContent.style.transition = '';
    
    // Remove any resize-related classes
    document.body.classList.remove('is-resizing');
    if (this.handlerBar) {
      this.handlerBar.classList.remove('is-resizing');
    }
    
    console.log('Container styles reset');
  }

  removeEventListeners() {
    if (this.handlerBar && this.onMouseDownBound) {
      this.handlerBar.removeEventListener('mousedown', this.onMouseDownBound);
      this.handlerBar.removeEventListener('dblclick', this.onDoubleClickBound);
    }
    if (this.onMouseMoveBound) {
      document.removeEventListener('mousemove', this.onMouseMoveBound);
    }
    if (this.onMouseUpBound) {
      document.removeEventListener('mouseup', this.onMouseUpBound);
    }
  }

  bindSidebarControlButtons() {
    const showDiagramBtn = document.getElementById('show-diagram-contianer-btn');
    const hideDiagramBtn = document.getElementById('hide-diagram-contianer-btn');
    const relayoutBtn = document.getElementById('relayout-classviz-btn');
    
    if (showDiagramBtn) {
      // Remove any existing listeners
      showDiagramBtn.removeEventListener('click', this.openTo35PercentBound);
      this.openTo35PercentBound = () => this.openTo35Percent();
      showDiagramBtn.addEventListener('click', this.openTo35PercentBound);
    }
    
    if (hideDiagramBtn) {
      // Remove any existing listeners
      hideDiagramBtn.removeEventListener('click', this.minimizeBound);
      this.minimizeBound = () => this.minimize();
      hideDiagramBtn.addEventListener('click', this.minimizeBound);
    }

    if (relayoutBtn) {
      // Remove any existing listeners
      relayoutBtn.removeEventListener('click', this.relayoutBound);
      this.relayoutBound = () => relayoutWithBottomSpace();
      relayoutBtn.addEventListener('click', this.relayoutBound);
    }
  }
  
  onMouseDown(e) {
    e.preventDefault();
    this.isResizing = true;
    this.startY = e.clientY;
    this.startHeight = parseInt(window.getComputedStyle(this.mainContent).height, 10);
    this.startMarginTop = parseInt(window.getComputedStyle(this.mainContent).marginTop, 10) || 0;
    
    document.body.classList.add('is-resizing');
    this.handlerBar.classList.add('is-resizing');
  }
  
  onMouseMove(e) {
    if (!this.isResizing) return;
    
    const deltaY = e.clientY - this.startY;
    
    // Calculate new values
    let newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.startHeight - deltaY));
    let newMarginTop = Math.max(0, Math.min(this.maxHeight - this.minHeight, this.startMarginTop + deltaY));
    
    // Ensure the relationship is maintained
    if (newHeight + newMarginTop !== this.maxHeight) {
      if (deltaY > 0) {
        newMarginTop = this.maxHeight - newHeight;
      } else {
        newHeight = this.maxHeight - newMarginTop;
      }
    }
    
    this.mainContent.style.height = `${newHeight}px`;
    this.mainContent.style.marginTop = `${newMarginTop}px`;
  }
  
  onMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
      document.body.classList.remove('is-resizing');
      this.handlerBar.classList.remove('is-resizing');
    }
  }
  
  onDoubleClick() {
    const currentHeight = parseInt(window.getComputedStyle(this.mainContent).height, 10);
    const currentHeightPercent = (currentHeight / this.maxHeight) * 100;
    
    if (currentHeightPercent < 30) {
      this.minimize();
    } else {
      this.maximize();
    }
  }
  
  openTo35Percent() {
    const targetHeight = this.maxHeight * 0.35;
    const targetMarginTop = this.maxHeight - targetHeight;
    
    this.mainContent.style.transition = 'height 0.3s, margin-top 0.3s';
    this.mainContent.style.height = `${targetHeight}px`;
    this.mainContent.style.marginTop = `${targetMarginTop}px`;
    setTimeout(() => {
      this.mainContent.style.transition = '';
    }, 300);
  }
  
  onWindowResize() {
    // Recalculate maximum height
    this.maxHeight = this.mainContent.scrollHeight || this.mainContent.clientHeight;
    
    // Adjust current heights based on new maximum
    const currentHeight = parseInt(window.getComputedStyle(this.mainContent).height, 10);
    if (currentHeight > this.minHeight) {
      // If expanded, keep the same height ratio
      const ratio = currentHeight / this.maxHeight;
      this.mainContent.style.height = `${this.maxHeight * ratio}px`;
      this.mainContent.style.marginTop = `${this.maxHeight - (this.maxHeight * ratio)}px`;
    } else {
      // If minimized, just update the margin
      this.mainContent.style.marginTop = `${this.maxHeight - this.minHeight}px`;
    }
  }
  
  maximize() {
    this.mainContent.style.transition = 'height 0.3s, margin-top 0.3s';
    this.mainContent.style.height = `${this.maxHeight}px`;
    this.mainContent.style.marginTop = '0px';
    setTimeout(() => {
      this.mainContent.style.transition = '';
    }, 300);
  }
  
  minimize() {
    this.mainContent.style.transition = 'height 0.3s, margin-top 0.3s';
    this.mainContent.style.height = `${this.minHeight}px`;
    this.mainContent.style.marginTop = `${this.maxHeight - this.minHeight}px`;
    setTimeout(() => {
      this.mainContent.style.transition = '';
    }, 300);
  }

  // 清理方法，供外部調用
  cleanup() {
    this.removeEventListeners();
    this.resetContainer();
    
    // 清理按鈕事件監聽器
    const showDiagramBtn = document.getElementById('show-diagram-contianer-btn');
    const hideDiagramBtn = document.getElementById('hide-diagram-contianer-btn');
    const relayoutBtn = document.getElementById('relayout-classviz-btn');
    
    if (showDiagramBtn && this.openTo35PercentBound) {
      showDiagramBtn.removeEventListener('click', this.openTo35PercentBound);
    }
    if (hideDiagramBtn && this.minimizeBound) {
      hideDiagramBtn.removeEventListener('click', this.minimizeBound);
    }
    if (relayoutBtn && this.relayoutBound) {
      relayoutBtn.removeEventListener('click', this.relayoutBound);
    }
    
    console.log('ResizeManager cleaned up');
  }
}