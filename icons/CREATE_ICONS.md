# Icon Creation Guide

## Required Icons
The extension needs the following icon files:

- `icon16.png` - 16x16 pixels (for extension menu)
- `icon32.png` - 32x32 pixels (for extension management page)  
- `icon48.png` - 48x48 pixels (for extension management page)
- `icon128.png` - 128x128 pixels (for Chrome Web Store)

## Design Guidelines

### Visual Concept
The Tone Adjuster icon should represent:
- Text/writing (document, pen, or text symbols)
- Adjustment/transformation (arrows, sliders, or magic wand)
- AI/intelligence (brain, sparkles, or geometric patterns)

### Suggested Design Elements
- Primary color: Blue (#2563eb) to match the extension theme
- Secondary colors: Light gray or white for contrast
- Style: Modern, clean, flat design
- Background: Transparent PNG

### Design Ideas

**Option 1: Text with Adjustment Arrows**
- Document icon with curved arrows around it
- Represents text transformation

**Option 2: Magic Wand with Sparkles**
- Magic wand icon with sparkle effects
- Represents AI-powered adjustment

**Option 3: Slider/Dial Interface**
- Circular dial or linear slider
- Represents tone adjustment control

**Option 4: Typography with Effects**
- Stylized "T" or "A" letter
- With gradient or glow effects

## Quick Icon Generation

### Using Online Tools
1. **Canva**: Create 128x128 design, then resize for other sizes
2. **Figma**: Design vector icon, export at different sizes
3. **IconFinder**: Find suitable icons (check licensing)
4. **Flaticon**: Search for "text adjust" or "tone" icons

### Using ImageMagick (Command Line)
If ImageMagick is available:
```bash
# Create a simple placeholder with text
convert -size 128x128 xc:white -font Arial -pointsize 72 -fill "#2563eb" -gravity center -annotate +0+0 "T" icon128.png
convert icon128.png -resize 48x48 icon48.png  
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

### Using GIMP/Photoshop
1. Create new 128x128 image with transparent background
2. Add icon elements (text, shapes, effects)
3. Save as PNG
4. Resize to create smaller versions

## Temporary Placeholder

For immediate testing, you can use any 128x128 PNG image renamed to the required filenames. The extension will load but the icons won't be meaningful.

## Testing Icons

After creating icons:
1. Reload the extension in Chrome
2. Check that icons appear in:
   - Extension toolbar
   - Extension management page (chrome://extensions/)
   - Context menus (if applicable)
3. Verify all sizes display clearly
4. Test on different screen densities

## Final Checklist
- [ ] All 4 icon sizes created
- [ ] PNG format with transparent background
- [ ] Consistent design across all sizes
- [ ] Readable at smallest size (16x16)
- [ ] Follows Chrome extension design guidelines
- [ ] Icons load without errors in Chrome