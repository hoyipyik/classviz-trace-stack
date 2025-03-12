/**
 * Creates the status section with toggle buttons and assigns IDs to checkboxes
 * @param {Object} nodeData - Node data containing status information
 * @returns {string} HTML for status section with embedded style tag
 */
export function createStatusSection(nodeData) {
    const status = nodeData && nodeData.status ? nodeData.status : {};
    
    const booleanStatusItems = [
        { label: 'Fan Out', property: 'fanOut' },
        { label: 'Implementation Entry Point', property: 'implementationEntryPoint' },
        { label: 'Chain Start Point', property: 'chainStartPoint' },
        { label: 'Is Summarised', property: 'isSummarised' }
    ];
    
    // Create toggle buttons for all status properties with unique IDs
    const toggleButtons = booleanStatusItems.map(item => {
        const isChecked = status[item.property] ? 'checked' : '';
        return `<div class="status-item">
            <span class="status-label">${item.label}:</span>
            <label class="toggle-switch">
                <input type="checkbox" class="status-toggle" 
                    id="checkbox-${item.property}" 
                    data-property="${item.property}"
                    ${isChecked}>
                <span class="slider round"></span>
            </label>
        </div>`;
    }).join('');

    // Embedded styles
    const styleTag = `
    <style>
        /* Toggle Switch Styles */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 22px;
            margin-left: 8px;
            vertical-align: middle;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
        }

        input:checked + .slider {
            background-color: #2196F3;
        }

        input:focus + .slider {
            box-shadow: 0 0 1px #2196F3;
        }

        input:checked + .slider:before {
            transform: translateX(24px);
        }

        /* Rounded sliders */
        .slider.round {
            border-radius: 22px;
        }

        .slider.round:before {
            border-radius: 50%;
        }

        /* Status container styling */
        .status-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .status-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }

        .status-label {
            min-width: 180px;
            font-weight: 500;
        }

        .info-section {
            margin-bottom: 16px;
        }

        .section-header {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 8px;
            text-transform: capitalize;
        }
    </style>
    `;

    return `${styleTag}
    <div class="info-section">
        <div class="section-header">Status</div>
        <div class="section-content status-container">
            ${toggleButtons}
        </div>
    </div>`;
}

/**
 * Binds event listeners to status toggle checkboxes
 * Uses document.querySelector to find elements by their IDs
 * @param {string} nodeId - The ID of the node to update (optional)
 */
export function setupStatusListeners(nodeId = null) {
    // List of properties to match the IDs we created
    const properties = ['fanOut', 'implementationEntryPoint', 'chainStartPoint', 'isSummarised'];
    
    // Bind listeners to each checkbox
    properties.forEach(property => {
        const checkbox = document.querySelector(`#checkbox-${property}`);
        
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                const isChecked = this.checked;
                const property = this.dataset.property;
                
                // Update the node data in cytoscape
                let targetNode;
                
                if (nodeId) {
                    // Use the provided nodeId
                    targetNode = window.cytrace.getElementById(nodeId);
                } else {
                    // Fall back to selected node if no nodeId provided
                    targetNode = window.cytrace.elements(':selected');
                }
                
                if (targetNode && targetNode.length) {
                    // Create status object if it doesn't exist
                    if (!targetNode.data('status')) {
                        targetNode.data('status', {});
                    }
                    
                    // Update the specific property
                    const status = targetNode.data('status');
                    status[property] = isChecked;
                    targetNode.data('status', status);
                    
                    console.log(`Updated node ${nodeId || 'selected'} - ${property} to ${isChecked}`);
                    
                    // Optional: Save graph changes
                    saveGraphChanges();
                }
            });
        } else {
            console.error(`Checkbox for property ${property} not found`);
        }
    });
}

/**
 * Save graph changes - implement this based on your application's needs
 */
function saveGraphChanges() {
    // This function should handle persistence of changes
    const graphData = window.cytrace.json();
    localStorage.setItem('graphData', JSON.stringify(graphData));
    
    // Or, if you have an API endpoint:
    // fetch('/api/save-graph', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(window.cytrace.json())
    // });
}