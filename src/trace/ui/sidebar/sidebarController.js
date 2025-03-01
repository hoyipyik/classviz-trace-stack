// sidebar/sidebarController.js - Functions to control sidebar visibility

let sidebarVisible = false;

/**
 * Functions to toggle sidebar visibility
 * @returns {Object} Object with show and hide functions
 */
export function toggleSidebar() {
    // Show sidebar function
    const showSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        if (!sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.className = 'sidebar-visible';
            sidebarVisible = true;
            // console.log('Showing sidebar', sidebarVisible);
        }
    };

    // Hide sidebar function
    const hideSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        // console.log(sidebarVisible, sidebar);
        if (sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(100%)';
            sidebar.className = 'sidebar-hidden';
            sidebarVisible = false;
            // console.log('Hiding sidebar', sidebarVisible);
        }
    };

    return { showSidebar, hideSidebar };
}