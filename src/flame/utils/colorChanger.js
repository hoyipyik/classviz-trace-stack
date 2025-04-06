export const colorUtils = {
    /**
     * Lighten a color by a specified factor
     * @param {string} color - The color to lighten
     * @param {number} factor - The factor to lighten by (default: 0.35)
     * @return {string} The lightened color
     */
    lightenColor(color, factor = 0.5) {
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
    },

    /**
     * Create a stronger version of a color without making it too dark or bright
     * @param {string} color - The color to modify
     * @param {number} factor - The intensity factor (default: 0.25)
     * @return {string} The enhanced color
     */
    darkenColor(color, factor = 0.25) {
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

        // Convert RGB to HSL to manipulate saturation directly
        // RGB to HSL conversion
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }
        
        // Increase saturation and slightly decrease lightness
        s = Math.min(1, s + factor * 0.5); // Increase saturation
        l = Math.max(0.1, l - factor * 0.15); // Slightly decrease lightness for stronger appearance
        
        // Convert back to RGB
        let r1, g1, b1;
        
        if (s === 0) {
            r1 = g1 = b1 = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r1 = hue2rgb(p, q, h + 1/3);
            g1 = hue2rgb(p, q, h);
            b1 = hue2rgb(p, q, h - 1/3);
        }

        // Convert back to 0-255 range
        r = Math.round(r1 * 255);
        g = Math.round(g1 * 255);
        b = Math.round(b1 * 255);

        // Ensure values stay within valid RGB range
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // Return as RGB format
        return `rgb(${r}, ${g}, ${b})`;
    }
}