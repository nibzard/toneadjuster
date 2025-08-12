# Critical Issues Fix Guide

## Issue 1: Missing Context Menu Permission

**File**: `manifest.json`  
**Problem**: Context menus won't work without proper permission

**Fix**:
```json
{
    "permissions": [
        "ai",
        "tabs",
        "contextMenus"
    ]
}
```

## Issue 2: API Message Handler Mismatch

**Files**: `content.js` (line ~264) and `background.js` (line ~82)

**Problem**: Content script sends `adjustTone` action but background expects `rewriteText`

**Fix Option A - Update content.js**:
Change line 264 from:
```javascript
action: 'adjustTone',
```
to:
```javascript
action: 'rewriteText',
```

**Fix Option B - Update background.js**:
Change line 82 from:
```javascript
case 'rewriteText':
```
to:
```javascript
case 'adjustTone':
```

## Issue 3: Create Icon Files

Create the following icon files in an `icons/` directory:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon32.png` (32x32 pixels) 
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

All icons should be PNG format with transparent background.

## Issue 4: Background Script Context Menu Permission Check

**File**: `background.js`

**Problem**: Code creates context menus without checking if permission exists

**Recommended Enhancement**:
```javascript
createContextMenus() {
    // Check if contextMenus permission exists
    if (!chrome.contextMenus) {
        console.warn('Context menus permission not available');
        return;
    }
    
    // Remove existing menus first
    chrome.contextMenus.removeAll(() => {
        // ... rest of existing code
    });
}
```