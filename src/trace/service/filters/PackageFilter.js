
// PackageFilter.js - Handle package-based filtering
export class PackageFilter {
    constructor(dataStore, renderer, eventBus) {
        this.data = dataStore;
        this.view = renderer;
        this.eventBus = eventBus;
    }

    setup() {
        // Find filter container
        const filterContainer = document.getElementById('packageFilter');
        if (!filterContainer) {
            console.error("Package filter container not found!");
            return;
        }

        // Get all package names
        const packageNames = this.data.getAllPackages();

        // Create package filter UI
        this.createUI(filterContainer, packageNames);
    }

    createUI(container, packageNames) {
        // Clear container
        container.innerHTML = '';

        // Create title
        const filterTitle = document.createElement('div');
        filterTitle.className = 'filter-title';
        container.appendChild(filterTitle);

        // If no packages, display message
        if (!packageNames || packageNames.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No package information in current thread';
            container.appendChild(emptyMessage);
            return;
        }

        // Create a wrapper for horizontal scrolling
        const containerWrapper = document.createElement('div');
        containerWrapper.className = 'package-filter-container';

        // Wrap the existing container with the scroll wrapper
        container.parentNode.insertBefore(containerWrapper, container);
        containerWrapper.appendChild(container);

        // Make sure the container has the right class
        container.className = 'package-filter';

        // Create checkbox for each package name
        packageNames.forEach(packageName => {
            const packageItem = document.createElement('div');
            packageItem.className = 'package-item';
            packageItem.dataset.package = packageName;
            const legendColor = this.data.getPackageColor(packageName);

            // Create checkbox container (for custom styling)
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'tri-state-checkbox';
            checkboxWrapper.dataset.package = packageName;

            // Add color indicator circle
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = legendColor || '#999'; // Use package color or default

            // Add click event
            checkboxWrapper.addEventListener('click', () => {
                this.toggleSelection(packageName);
            });

            // Create package name label
            const packageLabel = document.createElement('span');
            packageLabel.className = 'package-label';
            packageLabel.textContent = packageName;

            // Add elements to filter item
            packageItem.appendChild(checkboxWrapper);
            packageItem.appendChild(colorIndicator);
            packageItem.appendChild(packageLabel);

            // Add filter item to container
            container.appendChild(packageItem);
        });

        // Update all package selection states display
        this.updateAllStates();
    }

    toggleSelection(packageName) {
        // Get current state
        const currentState = this.data.getPackageSelectionState(packageName);

        // Determine new state: if current is true or null, change to false; if current is false, change to true
        const newState = currentState === false;

        // Apply selection state to all related nodes
        const changedIds = this.data.selectByPackage(packageName, newState);

        // Update UI
        this.view.batchUpdateNodes(changedIds);

        // Update package selection state display
        this.updateAllStates();

        this.eventBus.publish('refreshFlame', {});
    }

    updateAllStates() {
        // Get all package names
        const packageNames = this.data.getAllPackages();

        // Update state display for each package
        packageNames.forEach(packageName => {
            this.updateCheckboxUI(packageName);
        });
    }

    updateCheckboxUI(packageName) {
        // Get package selection state
        const state = this.data.getPackageSelectionState(packageName);

        // Find checkbox for corresponding package name
        const checkbox = document.querySelector(`.tri-state-checkbox[data-package="${packageName}"]`);
        if (checkbox) {
            // Update checkbox display
            checkbox.classList.remove('checked', 'unchecked', 'indeterminate');
            if (state === true) {
                checkbox.classList.add('checked');
            } else if (state === false) {
                checkbox.classList.add('unchecked');
            } else {
                checkbox.classList.add('indeterminate');
            }
        }
    }

    filterByPackage(packageName, visible = true) {
        // Find all nodes belonging to this package
        const nodeIds = [];

        this.data.nodes.forEach((nodeInfo, nodeId) => {
            if (nodeInfo.data.packageName === packageName) {
                nodeIds.push(nodeId);
            }
        });

        // Apply visibility
        this.setNodesVisibility(nodeIds, visible);

        return nodeIds;
    }

    setNodesVisibility(nodeIds, visible) {
        nodeIds.forEach(nodeId => {
            const element = this.data.getNodeElement(nodeId);
            if (element) {
                const li = element.closest('li');
                if (li) {
                    li.style.display = visible ? '' : 'none';
                }
            }
        });
    }
}