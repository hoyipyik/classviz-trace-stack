// sidebar/sidebarCreation.js - Functions to create sidebar elements
import { applySidebarStyles, addSourceCodeStyles } from './style.js';
import { toggleSidebar } from './sidebarController.js';

// Constants for element styling to avoid duplication and improve maintainability
const STYLES = {
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: '101',
    padding: '2px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#666',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px'
  },
  header: {
    backgroundColor: '#e6e6e6',
    padding: '10px',
    borderBottom: '1px solid #ccc',
    fontWeight: 'bold',
    paddingRight: '30px',
    position: 'relative',
    minHeight: '24px'
  },
  content: {
    padding: '0'
  }
};

/**
 * Create the sidebar element with all its components
 * @returns {HTMLElement} The sidebar container element
 */
export function createSidebar() {
  // Create sidebar controller once and reuse
  const sidebarController = toggleSidebar();
  
  // Create elements using helper functions
  const sidebar = createSidebarContainer();
  const closeButton = createCloseButton();
  const sidebarHeader = createSidebarHeader();
  const sidebarContent = createSidebarContent();
  
  // Build the DOM structure
  sidebar.append(closeButton, sidebarHeader, sidebarContent);
  
  // Add event listener to the close button
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebarController.hideSidebar();
  });
  
  // Add styles for source code display
  addSourceCodeStyles();
  
  return sidebar;
}

/**
 * Create the main sidebar container
 * @returns {HTMLElement} The sidebar container
 */
function createSidebarContainer() {
  const sidebar = document.createElement('div');
  sidebar.id = 'calltree-sidebar';
  sidebar.className = 'sidebar-hidden';
  
  // Apply styles to the sidebar element
  applySidebarStyles(sidebar);
  
  return sidebar;
}

/**
 * Create the close button for the sidebar
 * @returns {HTMLElement} The close button
 */
function createCloseButton() {
  const closeButton = document.createElement('button');
  closeButton.id = 'calltree-sidebar-close';
  closeButton.innerHTML = '&times;';
  closeButton.title = 'Close';
  
  // Apply styles
  Object.assign(closeButton.style, STYLES.closeButton);
  
  // Add hover effect with event delegation
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = '#e0e0e0';
  });
  
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
  
  return closeButton;
}

/**
 * Create the header for the sidebar
 * @returns {HTMLElement} The sidebar header
 */
function createSidebarHeader() {
  const sidebarHeader = document.createElement('div');
  sidebarHeader.id = 'calltree-sidebar-header';
  
  // Apply styles
  Object.assign(sidebarHeader.style, STYLES.header);
  
  sidebarHeader.innerHTML = '<div style="overflow-wrap: break-word; word-break: break-word; width: 100%;">Node Details</div>';
  
  return sidebarHeader;
}

/**
 * Create the content container for the sidebar
 * @returns {HTMLElement} The sidebar content container
 */
function createSidebarContent() {
  const sidebarContent = document.createElement('div');
  sidebarContent.id = 'calltree-sidebar-content';
  
  // Apply styles
  Object.assign(sidebarContent.style, STYLES.content);
  
  sidebarContent.innerHTML = '<div style="padding: 10px;">Select a node to view details</div>';
  
  return sidebarContent;
}