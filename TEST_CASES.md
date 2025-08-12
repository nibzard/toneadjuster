# Tone Adjuster Chrome Extension - Test Cases

## Test Environment Setup

### Prerequisites
- Chrome browser version 127 or later
- Chrome AI experimental features enabled (`chrome://flags/#optimization-guide-on-device-model`)
- Developer mode enabled in `chrome://extensions/`
- Extension loaded in unpacked mode

### Test Data Preparation
Create a test page with various text inputs:

```html
<!DOCTYPE html>
<html>
<head><title>Tone Adjuster Test Page</title></head>
<body>
    <!-- Regular input field -->
    <input type="text" id="textInput" value="I need help with this issue right away!" style="width: 400px; margin: 10px;">
    
    <!-- Textarea -->
    <textarea id="textArea" style="width: 400px; height: 100px; margin: 10px;">
Dear team,
We have encountered a problem that requires immediate attention. Please respond as soon as possible.
Best regards,
John
    </textarea>
    
    <!-- ContentEditable div -->
    <div contenteditable="true" id="editableDiv" style="border: 1px solid #ccc; padding: 10px; width: 400px; margin: 10px;">
        <p>This is a contenteditable paragraph. You can modify the tone of this text to make it sound more professional or friendly.</p>
    </div>
    
    <!-- Non-editable text (should not trigger tooltip) -->
    <p>This is regular paragraph text that should not be adjustable.</p>
    
    <!-- Gmail-like compose area simulation -->
    <div contenteditable="true" id="gmailLike" style="border: 1px solid #ccc; padding: 15px; width: 500px; margin: 10px; min-height: 150px;">
        <p>Subject: Project Update</p>
        <br>
        <p>Hi Sarah,</p>
        <p>I wanted to give you a quick update on the project. We're running behind schedule and I'm worried we won't meet the deadline. Can you please help me figure out what to do?</p>
        <p>Thanks,</p>
        <p>Mike</p>
    </div>
</body>
</html>
```

## Test Cases

### TC001: Extension Installation
**Objective**: Verify extension installs correctly
**Steps**:
1. Open Chrome Extensions page (`chrome://extensions/`)
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the Tone Adjuster extension directory
5. Verify extension appears in the list

**Expected Results**:
- Extension loads without errors
- Extension icon appears in toolbar
- Extension shows as "Enabled"

**Status**: [ ] Pass [ ] Fail  
**Notes**: _Record any error messages or unexpected behavior_

---

### TC002: Popup Interface
**Objective**: Verify popup displays correctly
**Steps**:
1. Click the Tone Adjuster icon in the toolbar
2. Observe the popup interface
3. Check all UI elements are present
4. Test responsive behavior

**Expected Results**:
- Popup opens within 100ms
- All sections visible (header, status, actions, help)
- Status indicator shows appropriate state
- UI is responsive and properly styled

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC003: AI Status Detection
**Objective**: Verify Chrome AI availability is properly detected
**Steps**:
1. Open extension popup
2. Observe AI status indicator
3. Wait for status to update
4. Check if download prompt appears (if needed)

**Expected Results**:
- Status shows "Checking..." initially
- Updates to either "Online" (green), "Offline" (red), or "Downloading" (yellow)
- Appropriate message displayed for each state
- Download progress tracked if applicable

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC004: Text Selection - Input Field
**Objective**: Test text selection in standard input fields
**Steps**:
1. Navigate to test page
2. Select text in the text input field
3. Observe tooltip appearance
4. Click outside to dismiss

**Expected Results**:
- Tooltip appears near selected text
- Contains all 6 tone options (Polish, Formal, Friendly, Confident, Concise, Unhinged)
- Positioned appropriately within viewport
- Dismisses when clicking outside

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC005: Text Selection - Textarea
**Objective**: Test text selection in textarea elements
**Steps**:
1. Select text in the textarea
2. Verify tooltip positioning
3. Test with text at different positions (top, middle, bottom)

**Expected Results**:
- Tooltip appears for all text positions
- Smart positioning (above/below based on available space)
- All UI elements functional

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC006: Text Selection - ContentEditable
**Objective**: Test text selection in contentEditable elements
**Steps**:
1. Select text in the contentEditable div
2. Test partial paragraph selection
3. Test cross-element selection
4. Test rich text formatting preservation

**Expected Results**:
- Works with all contentEditable scenarios
- Maintains text formatting where appropriate
- Handles complex DOM structures

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC007: Right-Click Context Menu
**Objective**: Verify context menu integration
**Steps**:
1. Select text in any editable field
2. Right-click on selected text
3. Look for "Adjust Tone" menu item
4. Hover over submenu options

**Expected Results**:
- "Adjust Tone" appears in context menu
- Submenu shows all 6 tone options
- Menu items are clickable
- Icons display correctly (if present)

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC008: Tone Adjustment - Formal
**Objective**: Test formal tone adjustment
**Test Text**: "hey can you help me out with this thing?"
**Steps**:
1. Select the test text
2. Click "Formal" tone button
3. Wait for processing
4. Review suggested text
5. Accept or reject the suggestion

**Expected Results**:
- Processing indicator appears
- Adjusted text is more formal/professional
- Preview shows before replacement
- Accept/reject options work correctly

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________
**Notes**: _______________________

---

### TC009: Tone Adjustment - Friendly
**Objective**: Test friendly tone adjustment
**Test Text**: "Please submit your report by the end of today."
**Steps**:
1. Select the test text
2. Click "Friendly" tone button
3. Wait for processing
4. Review suggested text

**Expected Results**:
- Text becomes more conversational and warm
- Maintains original meaning
- Processing completes within 5 seconds

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC010: Tone Adjustment - Confident
**Objective**: Test confident tone adjustment
**Test Text**: "I think maybe we should consider looking into this issue."
**Steps**:
1. Select the test text
2. Apply confident tone
3. Verify result is more assertive

**Expected Results**:
- Removes hesitant language ("maybe", "I think")
- Uses stronger, more decisive language
- Maintains professional tone

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC011: Tone Adjustment - Concise
**Objective**: Test concise tone adjustment
**Test Text**: "I wanted to reach out to you today to let you know that we have been working on the project and we have made some progress, but there are still some things that need to be addressed."
**Steps**:
1. Select the lengthy text
2. Apply concise tone
3. Verify result is shorter and clearer

**Expected Results**:
- Text is significantly shortened
- Key information preserved
- Clear and direct language

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC012: Tone Adjustment - Polish
**Objective**: Test grammar, spelling, and fluency correction
**Test Text**: "i think we shud do this its more better for the team cause they was waiting"
**Steps**:
1. Select the test text
2. Click "Polish" tone button
3. Wait for processing
4. Review suggested text

**Expected Results**:
- Grammatical errors are corrected (e.g., "they was" -> "they were")
- Spelling errors are corrected (e.g., "shud" -> "should")
- Fluency is improved (e.g., "its more better" -> "it is better" or "it is more effective")
- Original meaning is preserved.

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC013: Tone Adjustment - Unhinged
**Objective**: Test creative and chaotic text generation
**Test Text**: "I need to finish this report by Friday."
**Steps**:
1. Select the test text
2. Click "Unhinged" tone button
3. Wait for processing
4. Review suggested text

**Expected Results**:
- Text is rewritten in a humorous, exaggerated, or surreal manner.
- Output is unexpected but related to the original concept of "report" and "Friday".
- The tone is clearly not serious or professional.

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC014: Error Handling - AI Unavailable
**Objective**: Test behavior when Chrome AI is not available
**Steps**:
1. Disable Chrome AI features (if possible)
2. Try to adjust tone
3. Verify error handling

**Expected Results**:
- Clear error message displayed
- Helpful troubleshooting information
- No crashes or broken states
- Graceful degradation

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC015: Error Handling - Network Issues
**Objective**: Test behavior during processing failures
**Steps**:
1. Simulate processing failure (disconnect network if needed)
2. Try tone adjustment
3. Check error recovery

**Expected Results**:
- Timeout handling works correctly
- Retry mechanism available
- User informed of issue
- Can recover without restart

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC016: Text Replacement Accuracy
**Objective**: Verify text replacement works correctly
**Test Text**: "This is the original text that will be replaced."
**Steps**:
1. Select the test text
2. Get adjusted version
3. Accept the suggestion
4. Verify original text is fully replaced
5. Check cursor position

**Expected Results**:
- Original text completely replaced
- No extra or missing characters
- Cursor positioned after new text
- Undo functionality works (Ctrl+Z)

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC017: Large Text Handling
**Objective**: Test with large text selections
**Test Text**: _[Use a paragraph of 500+ words]_
**Steps**:
1. Select large amount of text
2. Apply tone adjustment
3. Monitor performance and memory usage

**Expected Results**:
- Processes within reasonable time (< 10 seconds)
- No browser freezing or crashes
- Memory usage remains reasonable
- Quality maintained for longer text

**Status**: [ ] Pass [ ] Fail  
**Processing Time**: _______________________

---

### TC018: Special Characters Handling
**Objective**: Test with text containing special characters
**Test Text**: "Hello! How are you? 🙂 This costs $50.99 (50% off). Email: test@example.com"
**Steps**:
1. Select text with emojis, symbols, and formatting
2. Apply tone adjustment
3. Verify character preservation

**Expected Results**:
- Special characters preserved correctly
- Emojis maintained or appropriately replaced
- No encoding issues
- Formatting intact

**Status**: [ ] Pass [ ] Fail  
**Adjusted Text**: _______________________

---

### TC019: Multiple Quick Adjustments
**Objective**: Test rapid successive tone adjustments
**Steps**:
1. Select text and apply one tone
2. Immediately select different text
3. Apply different tone
4. Repeat several times quickly

**Expected Results**:
- No conflicts between multiple requests
- Previous tooltips properly dismissed
- No memory leaks
- Consistent performance

**Status**: [ ] Pass [ ] Fail  
**Notes**: _______________________

---

### TC020: Privacy Validation
**Objective**: Verify no external network requests
**Steps**:
1. Open browser developer tools (Network tab)
2. Perform several tone adjustments
3. Monitor network activity
4. Verify local processing

**Expected Results**:
- No external API calls visible in network tab
- Only local chrome-extension:// requests
- Processing happens on-device
- No data transmitted externally

**Status**: [ ] Pass [ ] Fail  
**Network Requests**: _______________________

---

### TC021: Browser Compatibility
**Objective**: Test across different Chrome versions and platforms
**Steps**:
1. Test on Chrome 127+ (minimum supported)
2. Test on latest Chrome stable
3. Test on different OS (Windows/Mac/Linux if available)

**Expected Results**:
- Consistent behavior across versions
- UI displays correctly on all platforms
- Performance similar across environments

**Status**: [ ] Pass [ ] Fail  
**Chrome Version**: _______________________
**Platform**: _______________________

---

## Performance Benchmarks

### Load Time Tests
- [ ] Extension popup opens in < 100ms
- [ ] AI status check completes in < 2 seconds
- [ ] Tooltip appears in < 50ms after text selection

### Processing Time Tests
- [ ] Short text (< 50 words): < 2 seconds
- [ ] Medium text (50-200 words): < 5 seconds
- [ ] Large text (200+ words): < 10 seconds

### Memory Usage Tests
- [ ] Background script uses < 50MB
- [ ] Content script adds < 10MB per tab
- [ ] No memory leaks after multiple adjustments

## Accessibility Tests

### Keyboard Navigation
- [ ] Tab navigation works in popup
- [ ] Escape key closes tooltip
- [ ] Enter key activates focused buttons
- [ ] Screen reader compatibility

### Visual Accessibility
- [ ] High contrast mode support
- [ ] Text remains readable at 200% zoom
- [ ] Color contrast meets WCAG guidelines
- [ ] Focus indicators clearly visible

## Security Tests

### Content Security Policy
- [ ] No inline scripts executed
- [ ] No eval() or similar dangerous functions
- [ ] All resources loaded from extension
- [ ] No XSS vulnerabilities in dynamic content

### Data Handling
- [ ] User text not logged or stored permanently
- [ ] No sensitive data in console logs
- [ ] Proper cleanup of temporary data
- [ ] No data persistence beyond session

---

## Test Execution Summary

**Total Test Cases**: 21  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___  
**Not Executed**: ___  

**Overall Status**: ⚠️ Testing Required  
**Recommendation**: Complete all test cases before deployment

**Critical Issues Found**:
1. ________________________________
2. ________________________________
3. ________________________________

**Testing Date**: _________________  
**Tester**: _______________________  
**Chrome Version**: _______________  
**OS**: __________________________