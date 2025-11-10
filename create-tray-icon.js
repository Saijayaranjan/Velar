const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a 16x16 canvas for the tray icon
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Set transparent background
ctx.clearRect(0, 0, 16, 16);

// Draw a simple "V" in black
ctx.fillStyle = '#000000';
ctx.font = 'bold 14px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('V', 8, 8);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'assets/icons/trayTemplate.png'), buffer);

console.log('Tray template icon created: assets/icons/trayTemplate.png');
