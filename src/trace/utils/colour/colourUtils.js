
export const generateFocusedBorderColors = (count) => {
    const colors = [];

    // Predefined bright and vibrant colors (avoiding gray/black completely)
    const vibrantColors = [
        '#FF0080', // Hot Pink/Magenta
        '#00FF40', // Electric Green
        '#FF4000', // Electric Red-Orange
        '#0080FF', // Electric Blue
        '#FF8000', // Bright Orange
        '#8000FF', // Electric Purple
        '#FFFF00', // Pure Yellow
        '#00FFFF', // Cyan
        '#FF0040', // Crimson Red
        '#40FF00', // Lime Green
        '#FF00FF', // Magenta
        '#00FF80', // Spring Green
        '#FF4080', // Pink
        '#8040FF', // Blue-Purple
        '#FFBF00', // Amber
        '#00BFFF', // Deep Sky Blue
        '#FF6040', // Coral
        '#80FF40', // Yellow-Green
        '#FF0000', // Pure Red
        '#0040FF', // Royal Blue
    ];

    // If we need more colors than predefined, generate additional bright ones
    if (count > vibrantColors.length) {
        // Generate additional bright colors using HSL with high saturation and lightness
        const extraCount = count - vibrantColors.length;
        
        for (let i = 0; i < extraCount; i++) {
            // Use golden ratio for better color distribution
            const hue = (i * 137.508) % 360; // Golden angle approximation
            const saturation = 90 + (i % 2) * 10; // 90% or 100% saturation
            const lightness = 50 + (i % 3) * 10;  // 50%, 60%, or 70% lightness
            
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            colors.push(color);
        }
    }

    // Add predefined vibrant colors up to the required count
    const colorsToAdd = Math.min(count, vibrantColors.length);
    for (let i = 0; i < colorsToAdd; i++) {
        colors.push(vibrantColors[i]);
    }

    // Shuffle the colors to avoid predictable patterns
    // Simple Fisher-Yates shuffle
    for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
    }

    // Ensure we return exactly the requested count
    return colors.slice(0, count);
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