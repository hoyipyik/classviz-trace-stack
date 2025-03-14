// cytoscape/hoverCard.js - Handles hover card creation and management

/**
 * Create a hover card for displaying node information
 * @returns {Object} An API for managing the hover card
 */
export function createHoverCardManager() {
    // The hover card element
    let hoverCard = null;
    // Track if mouse is over the card
    let isMouseOverCard = false;
    // Store timeouts to clear them when needed
    let hideTimeout = null;
  
    /**
     * Create the hover card DOM element
     */
    function createCardElement() {
      // Remove existing card if present
      if (hoverCard && hoverCard.parentNode) {
        hoverCard.parentNode.removeChild(hoverCard);
      }
      
      // Create hover card element
      hoverCard = document.createElement('div');
      hoverCard.id = 'node-hover-card';
      
      // Apply styles directly to ensure they are applied
      Object.assign(hoverCard.style, {
        position: 'absolute',
        zIndex: '1000',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        pointerEvents: 'auto',
        transition: 'opacity 0.2s ease',
        minWidth: '250px',
        maxWidth: '300px',
        wordWrap: 'break-word',
        display: 'none'
      });
      
      // Add mouse events to the card itself
      hoverCard.addEventListener('mouseenter', handleCardMouseEnter);
      hoverCard.addEventListener('mouseleave', handleCardMouseLeave);
      
      // Add the hover card to the document
      document.body.appendChild(hoverCard);
      
      return hoverCard;
    }
  
    /**
     * Handle mouse enter on the card
     */
    function handleCardMouseEnter() {
      isMouseOverCard = true;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }
  
    /**
     * Handle mouse leave on the card
     */
    function handleCardMouseLeave() {
      isMouseOverCard = false;
      hideTimeout = setTimeout(() => {
        if (!isMouseOverCard) {
          hideCard();
        }
      }, 300);
    }
  
    /**
     * Show the hover card with node data
     * @param {Object} nodeData - Data from the node
     * @param {Object} position - The position {x, y} to show the card
     * @param {Array} controlButtons - Array of control buttons to add
     */
    function showCard(nodeData, position, controlButtons = []) {
      // Create card if it doesn't exist
      if (!hoverCard) {
        createCardElement();
      }
      
      // Get node name or label
      const nodeName = nodeData.name || nodeData.label || nodeData.id;
      
      // Create content for the hover card
      hoverCard.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; color: #333;">${nodeName}</div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
          ${nodeData.description || 'No description available'}
        </div>
        ${controlButtons.length > 0 ? `
          <div class="control-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${controlButtons.map(btn => `
              <button id="${btn.id}" style="flex: 1; min-width: 115px; padding: 5px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; background-color: #f1f3f4; color: #333; text-align: center; transition: background-color 0.2s;">
                ${btn.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      `;
      
      // Add the pointer element to make it look like a speech bubble
      const pointer = document.createElement('div');
      pointer.style.position = 'absolute';
      pointer.style.width = '0';
      pointer.style.height = '0';
      pointer.style.borderWidth = '10px';
      pointer.style.borderStyle = 'solid';
      pointer.style.borderColor = 'transparent white transparent transparent';
      pointer.style.left = '-20px';
      pointer.style.bottom = '15px';
      hoverCard.appendChild(pointer);
  
      // First make it visible but offscreen to calculate dimensions
      hoverCard.style.display = 'block';
      hoverCard.style.left = '-9999px';
      hoverCard.style.top = '-9999px';
      
      // Now we can get the actual dimensions
      const cardHeight = hoverCard.offsetHeight;
      
      // Position the hover card to the right of the node, vertically centered
      hoverCard.style.left = `${position.x + 20}px`;
      hoverCard.style.top = `${position.y - cardHeight/2}px`;
      
      // Ensure the card stays within the viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = hoverCard.getBoundingClientRect();
      
      if (rect.right > viewportWidth - 10) {
        hoverCard.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      
      if (rect.top < 10) {
        hoverCard.style.top = '10px';
      } else if (rect.bottom > viewportHeight - 10) {
        hoverCard.style.top = `${viewportHeight - rect.height - 10}px`;
      }
      
      // Add event listeners for control buttons
      controlButtons.forEach(btn => {
        const button = document.getElementById(btn.id);
        if (button) {
          button.addEventListener('click', async function(event) {
            event.stopPropagation();
            if (btn.handler) {
              // Call the handler and pass the node ID
              btn.handler(nodeData.id);
            }
          });
        }
      });
      
      // Clear any pending hide timeouts
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    }
  
    /**
     * Hide the hover card
     */
    function hideCard() {
      if (hoverCard) {
        hoverCard.style.display = 'none';
      }
    }
  
    /**
     * Destroy the hover card
     */
    function destroy() {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      if (hoverCard && hoverCard.parentNode) {
        hoverCard.parentNode.removeChild(hoverCard);
        hoverCard = null;
      }
    }
    /**
     * Check if mouse is over the card
     * @returns {boolean} True if mouse is over the card
     */
    function isMouseOver() {
      return isMouseOverCard;
    }
  
    // Public API
    return {
      showCard,
      hideCard,
      isMouseOver,
      destroy
    };
  }