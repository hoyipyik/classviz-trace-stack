export const colorUtils = {
    /**
     * Darken a color by a specified factor
     * @param {string} color - The color to darken
     * @param {number} factor - The factor to darken by (default: 0.3)
     * @return {string} The darkened color
     */
    darkenColor(color, factor = 0.3) {
        let r, g, b;
        if (color.startsWith('#')) {
            // Handle hex color
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            // Handle rgb color
            const rgbValues = color.match(/\d+/g);
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        } else {
            // For other color formats, return the original color
            return color;
        }

        // Darken the color
        r = Math.floor(r * (1 - factor));
        g = Math.floor(g * (1 - factor));
        b = Math.floor(b * (1 - factor));

        // Return as RGB format
        return `rgb(${r}, ${g}, ${b})`;
    },

    /**
     * Lighten a color by a specified factor
     * @param {string} color - The color to lighten
     * @param {number} factor - The factor to lighten by (default: 0.3)
     * @return {string} The lightened color
     */
    lightenColor(color, factor = 0.3) {
        let r, g, b;
        if (color.startsWith('#')) {
            // Handle hex color
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            // Handle rgb color
            const rgbValues = color.match(/\d+/g);
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        } else {
            // For other color formats, return the original color
            return color;
        }

        // Lighten the color (add a percentage of the remaining distance to 255)
        r = Math.min(255, Math.floor(r + (255 - r) * factor));
        g = Math.min(255, Math.floor(g + (255 - g) * factor));
        b = Math.min(255, Math.floor(b + (255 - b) * factor));

        // Return as RGB format
        return `rgb(${r}, ${g}, ${b})`;
    }
};