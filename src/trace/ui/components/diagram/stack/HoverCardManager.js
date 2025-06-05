// HoverCardManager.js 
export class HoverCardManager {
  constructor(dataStore, explainer) {
    this.data = dataStore;
    this.explainer = explainer;
  }

  attachHoverEvents(itemDiv, nodeId) {
    const itemData = this.data.nodes.get(nodeId).data;
    const hoverCard = this._createHoverCardElement();

    const handleMouseOver = (e) => {
      if (this._shouldIgnoreHover(e)) return;

      const isSpecialNode = this._isSpecialNode(itemData);
      const regionText = this.explainer.regions.get(nodeId)?.briefSummary;

      if (isSpecialNode && regionText) {
        this._showHoverCard(hoverCard, itemData, regionText, e);
      }
    };

    const handleMouseOut = () => {
      hoverCard.style.display = 'none';
    };

    itemDiv.addEventListener('mouseover', handleMouseOver);
    itemDiv.addEventListener('mouseout', handleMouseOut);

    return () => {
      itemDiv.removeEventListener('mouseover', handleMouseOver);
      itemDiv.removeEventListener('mouseout', handleMouseOut);
      if (document.body.contains(hoverCard)) {
        document.body.removeChild(hoverCard);
      }
    };
  }

  _createHoverCardElement() {
    const hoverCard = document.createElement('div');
    Object.assign(hoverCard.style, {
      display: 'none',
      position: 'fixed',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      width: '450px',
      zIndex: '10000'
    });
    hoverCard.className = 'hover-card';
    document.body.appendChild(hoverCard);
    return hoverCard;
  }

  _shouldIgnoreHover(e) {
    return e.target.matches('.checkbox') || e.target.matches('.toggle-btn');
  }

  _isSpecialNode(itemData) {
    return itemData.status && (
      itemData.status.fanOut ||
      itemData.status.implementationEntryPoint ||
      itemData.status.recursiveEntryPoint
    );
  }

  _showHoverCard(hoverCard, itemData, regionText, e) {
    hoverCard.innerHTML = '';

    const labelRow = document.createElement('div');
    labelRow.innerHTML = `<strong>${itemData.label}</strong>`;
    hoverCard.appendChild(labelRow);

    const regionRow = document.createElement('div');
    regionRow.innerHTML = regionText;
    hoverCard.appendChild(regionRow);

    const position = this._calculateHoverPosition(e.clientX, e.clientY);
    hoverCard.style.left = `${position.left}px`;
    hoverCard.style.top = `${position.top}px`;
    hoverCard.style.display = 'block';
  }

  _calculateHoverPosition(mouseX, mouseY) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = 450;
    const cardHeight = 100;

    let left = mouseX + 10;
    let top = mouseY;

    if (left + cardWidth > viewportWidth) {
      left = Math.max(0, mouseX - cardWidth - 10);
    }

    if (top + cardHeight > viewportHeight) {
      top = Math.max(0, mouseY - cardHeight);
    }

    return { left, top };
  }
}
