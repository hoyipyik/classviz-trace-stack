
export const generateFocusedBorderColors = (count) => {
    const colors = [];

    colors.push('#FFCC00'); // add first default bright yellow

    const vibrantColors = [
        '#FF3300', // bright red
        '#FF00FF', // magenta
        '#00CCFF', // bright blue
        '#33CC33', // bright green
        '#FF6600', // orange
        '#9933FF', // purple
        '#00FF99', // cyan green
        '#FF3399', // pink
    ];

    // If more colors are needed, generate additional vibrant colors using HSL
    if (count > vibrantColors.length + 1) {
        // High saturation and lightness ensure vibrant colors
        const saturation = 100; // maximum saturation
        const lightness = 55;   // moderate but sufficiently vibrant lightness

        // Evenly distributed initial points on the hue wheel
        const baseHues = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];

        for (let i = 0; i < count - vibrantColors.length - 1; i++) {
            const hue = baseHues[i % baseHues.length];
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            colors.push(color);
        }
    }

    // Add predefined vibrant colors (after yellow)
    for (let i = 0; i < Math.min(count - 1, vibrantColors.length); i++) {
        colors.push(vibrantColors[i]);
    }

    return colors;
}


/**
  * Generate a color spectrum array
  * @param {Number} count - Number of colors needed
  * @returns {Array} - Array of colors
  */
export const generateColorSpectrum = (count) => {
    const colors = [];

    // Using HSL color space makes it easier to generate evenly distributed colors
    // H: Hue (0-360), S: Saturation (0-100), L: Lightness (0-100)
    const saturation = 80; // Fixed saturation
    const lightness = 50;  // Fixed lightness

    if (count <= 0) return colors;

    // Generate evenly distributed colors
    for (let i = 0; i < count; i++) {
        // Evenly distribute hue values across the spectrum
        const hue = Math.floor((i / count) * 360);
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        colors.push(color);
    }

    return colors;
}