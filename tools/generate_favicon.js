// Simple favicon generator for medical theme
// This creates a base64 data URL for a medical cross favicon

function generateMedicalFavicon() {
    // Create a 16x16 medical cross favicon as base64
    // Blue background (#2196F3) with white cross
    
    const faviconData = [
        "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJYSURBVFiFtZc9SMNQFIV",
        "faviconExample"
    ];
    
    // For a simple approach, let's create an SVG favicon
    const svgFavicon = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <!-- Blue medical background -->
        <rect width="32" height="32" rx="6" fill="#2196F3"/>
        
        <!-- White medical cross -->
        <rect x="13" y="8" width="6" height="16" rx="1" fill="white"/>
        <rect x="8" y="13" width="16" height="6" rx="1" fill="white"/>
        
        <!-- Small accent dots -->
        <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
        <circle cx="22" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
        <circle cx="10" cy="22" r="1.5" fill="rgba(255,255,255,0.6)"/>
        <circle cx="22" cy="22" r="1.5" fill="rgba(255,255,255,0.6)"/>
    </svg>`;
    
    return svgFavicon;
}

console.log('Medical favicon SVG generated');
console.log(generateMedicalFavicon());