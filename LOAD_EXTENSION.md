# Loading and Testing The Tone Adjuster Extension

## Prerequisites
- Chrome version 138 or later
- Windows 10/11 or macOS 13+ 
- GPU with >4GB VRAM
- At least 22 GB free storage

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/Users/nikola/dev/toneadjuster` directory (this directory)
5. The extension should now appear in your extensions list

### After Making Code Changes
1. Go to `chrome://extensions/`
2. Click the reload button (↻) on the Tone Adjuster extension card
3. Refresh any test pages you have open

## Testing the Extension

### Method 1: Test Page
1. After loading the extension, open the included test page:
   - Open `test-extension.html` in Chrome
   - Or navigate to: `file:///Users/nikola/dev/toneadjuster/test-extension.html`

2. The page will show AI availability status at the top

3. Try selecting text in any of the test areas and:
   - Right-click and choose "Adjust Tone" from the context menu
   - Or wait for the tooltip to appear above your selection

### Method 2: Any Website
1. Navigate to any website with editable text fields
2. Select text in an input, textarea, or contenteditable element
3. Right-click and choose "Adjust Tone" → Select a tone option
4. Or use the tooltip that appears when you select text

## Tone Options
- **Polish**: Corrects grammar and spelling errors
- **Formal**: Makes text more professional
- **Friendly**: Makes text warmer and more approachable
- **Confident**: Makes text more assertive and decisive
- **Concise**: Shortens text while keeping meaning
- **Unhinged**: Makes text wildly expressive (fun mode!)

## Troubleshooting

### Extension Not Loading
- Check console for errors: Right-click extension icon → "Inspect popup"
- Ensure all files are present (manifest.json, background.js, content.js, etc.)

### AI Not Available
- Check Chrome version (must be 138+)
- Verify hardware requirements (GPU, storage)
- Check `chrome://components/` for "Optimization Guide On Device Model"
- Try `chrome://flags/#optimization-guide-on-device-model` → Set to "Enabled BypassPerfRequirement"

### Context Menu Not Appearing
- Reload the extension
- Check if text is selected in an editable field
- Check background script console for errors

### Text Not Being Rewritten
- Open DevTools Console (F12) and check for errors
- Verify AI is available (check test page status)
- Try with shorter text first (under 500 characters)

## Files Fixed
- Removed ES6 import from content.js (DOMPurify not needed)
- Content script now works without bundling
- Extension can be loaded directly without build step