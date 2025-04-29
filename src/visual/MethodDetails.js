// MethodDetails.js - Method details display with modal approach
class MethodDetails {
  constructor(dataStore, eventBus) {
    // Data store reference
    this.data = dataStore;
    
    // Event bus
    this.eventBus = eventBus;
    
    // Initialize
    this.init();
  }
  
  // Initialize the component
  init() {
    // Set up modal and tabs
    this.setupModal();
    
    // Set up the view details button
    this.setupViewButton();
    
    // Listen for node selection events
    if (this.eventBus) {
      this.eventBus.subscribe('changeCurrentFocusedNode', (data) => {
        if (data && data.nodeId) {
          // Enable the view details button
          const viewBtn = document.getElementById('viewMethodDetailsBtn');
          if (viewBtn) {
            viewBtn.disabled = false;
          }
        } else {
          // If no node is selected, disable the button
          const viewBtn = document.getElementById('viewMethodDetailsBtn');
          if (viewBtn) {
            viewBtn.disabled = true;
          }
        }
      });
    }
  }
  
  // Set up modal and tabs
  setupModal() {
    // Get modal elements
    const modal = document.getElementById('methodDetailsModal');
    const closeBtn = document.getElementById('closeMethodDetails');
    const tabs = document.querySelectorAll('.method-detail-tab');
    
    // Set up close button
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideModal();
      });
    }
    
    // Set up tabs
    if (tabs) {
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.getAttribute('data-tab');
          this.switchTab(tabId);
        });
      });
    }
    
    // Close modal when clicking outside content
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }
  }
  
  // Set up view details button
  setupViewButton() {
    const viewBtn = document.getElementById('viewMethodDetailsBtn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        if (this.data.current) {
          this.showModal();
          this.updateMethodDetails(this.data.current);
        }
      });
    }
  }
  
  // Show the modal
  showModal() {
    const modal = document.getElementById('methodDetailsModal');
    if (modal) {
      modal.classList.add('active');
    }
  }
  
  // Hide the modal
  hideModal() {
    const modal = document.getElementById('methodDetailsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }
  
  // Switch to a specific tab
  switchTab(tabId) {
    // Get all tabs and content
    const tabs = document.querySelectorAll('.method-detail-tab');
    const contents = document.querySelectorAll('.method-details-tab-content');
    
    // Remove active class from all
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`.method-detail-tab[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`${tabId}Tab`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
  }
  
  // Update boolean status
  updateBooleanStatus(fieldId, value) {
    if (!this.data.current) return;
    
    const nodeData = this.data.getNodeDataById(this.data.current);
    if (!nodeData || !nodeData.status) return;
    
    // Determine which property to update based on field ID
    let property = '';
    switch(fieldId) {
      case 'methodFanOut':
        property = 'fanOut';
        break;
      case 'methodRecursiveEntryPoint':
        property = 'recursiveEntryPoint';
        break;
      case 'methodImplementationEntryPoint':
        property = 'implementationEntryPoint';
        break;
      default:
        return;
    }
    
    // Update node data
    nodeData.status[property] = value;
    
    // If there's an event bus, notify other components that data has been updated
    if (this.eventBus) {
      this.eventBus.publish('nodeDataChanged', {
        nodeId: this.data.current,
        field: property,
        value: value
      });
    }
  }
  
  // Update method details display
  updateMethodDetails(nodeId) {
    const nodeData = this.data.getNodeDataById(nodeId);
    if (!nodeData) {
      return;
    }
    
    // Simple values
    this.updateField('methodId', nodeData.id || '-');
    this.updateField('methodParentId', nodeData.parentId || '-');
    this.updateField('methodLabel', nodeData.label || '-');
    this.updateField('methodVisibility', nodeData.visibility || '-');
    this.updateField('methodClassName', nodeData.className || '-');
    this.updateField('methodMethodName', nodeData.methodName || '-');
    this.updateField('methodPackageName', nodeData.packageName || '-');
    this.updateField('methodLayer', nodeData.layer || '-');
    this.updateField('methodDescription', nodeData.description || '-');
    this.updateField('methodBriefSummary', nodeData.briefSummary || '-');
    this.updateField('methodTime', this.formatTime(nodeData.time) || '-');
    this.updateField('methodSelfTime', this.formatTime(nodeData.selfTime) || '-');
    
    // Tree stats
    const treeStats = nodeData.treeStats || {};
    this.updateField('methodDirectChildren', treeStats.directChildrenCount || '-');
    this.updateField('methodTotalDescendants', treeStats.totalDescendants || '-');
    this.updateField('methodSubtreeDepth', treeStats.subtreeDepth || '-');
    this.updateField('methodLevel', treeStats.level || '-');
    
    // Status flags - use checkboxes instead of text display
    const status = nodeData.status || {};
    this.updateCheckbox('methodFanOut', status.fanOut);
    this.updateCheckbox('methodImplementationEntryPoint', status.implementationEntryPoint);
    this.updateCheckbox('methodChainStartPoint', status.chainStartPoint);
    this.updateCheckbox('methodRecursiveEntryPoint', status.recursiveEntryPoint);
    this.updateField('methodIsSummarised', this.getBooleanDisplay(status.isSummarised));
    
    // Multiline fields
    this.updateField('methodDetailedBehavior', nodeData.detailedBehavior || '-');
    this.updateField('methodSourceCode', nodeData.sourceCode || '-');
  }
  
  // Helper method to update a field
  updateField(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }
  
  // Helper method to update a checkbox
  updateCheckbox(elementId, value) {
    const checkboxContainer = document.getElementById(elementId);
    if (!checkboxContainer) return;
    
    // Ensure the container is empty
    checkboxContainer.innerHTML = '';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!value; // Ensure value is boolean
    checkbox.className = 'status-checkbox';
    
    // Add event listener
    checkbox.addEventListener('change', (e) => {
      this.updateBooleanStatus(elementId, e.target.checked);
    });
    
    // Add the checkbox to the container
    checkboxContainer.appendChild(checkbox);
  }
  
  // Helper to format time
  formatTime(timeInNanos) {
    if (!timeInNanos) return '-';
    return parseFloat(timeInNanos).toLocaleString() + 'ns';
  }
  
  // Helper to display boolean values (for non-checkbox booleans)
  getBooleanDisplay(value) {
    if (value === true) return '✓';
    if (value === false) return '✗';
    return '-';
  }
}

export { MethodDetails };