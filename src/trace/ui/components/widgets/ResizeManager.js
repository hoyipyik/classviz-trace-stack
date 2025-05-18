// Simple ResizeManager.js - Handles panel resizing with minimal code
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
    
    // Setup event listeners
    this.handlerBar.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.handlerBar.addEventListener('dblclick', this.onDoubleClick.bind(this));
    // window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.bindSidebarControlButtons();
  }

  bindSidebarControlButtons() {
      const showDiagramBtn = document.getElementById('show-diagram-contianer-btn');
      const hideDiagramBtn = document.getElementById('hide-diagram-contianer-btn');
      showDiagramBtn.addEventListener('click', () => {
          this.maximize();
      });
      hideDiagramBtn.addEventListener('click', () => {
          this.minimize();
      });

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
    if (currentHeight < this.maxHeight * 0.5) {
      this.maximize();
    } else {
      this.minimize();
    }
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
}