/**
 * Tone Adjuster Chrome Extension - Content Script
 * Handles text selection detection, UI injection, and tone adjustment workflow
 */

class ToneAdjuster {
    constructor() {
        this.currentSelection = null;
        this.selectedText = '';
        this.targetElement = null;
        this.selectionRange = null;
        this.tooltip = null;
        this.isProcessing = false;
        this.tooltipInteracting = false;
        this.settings = null;
        
        // Store bound handler for removal/re-adding
        this.boundHandleClickOutside = this.handleClickOutside.bind(this);
        
        // Tone options
        this.tones = [
            { id: 'polish', label: 'Polish', icon: '💎' },
            { id: 'engaging', label: 'Engaging', icon: '📋' },
            { id: 'friendly', label: 'Friendly', icon: '😊' },
            { id: 'confident', label: 'Confident', icon: '💪' },
            { id: 'concise', label: 'Concise', icon: '⚡' },
            { id: 'unhinged', label: 'Unhinged', icon: '🤪' }
        ];
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Tone Adjuster content script initializing...');
        
        // Load settings from background script (with fallback)
        await this.loadSettings();
        
        this.attachEventListeners();
        this.injectStyles();
        console.log('✅ Tone Adjuster content script initialized successfully');
    }
    
    async loadSettings() {
        // Set default settings first
        this.settings = {
            defaultTone: 'polish',
            autoAccept: false,
            showTooltip: true,
            enableContextMenu: true,
            creativity: 0.8,
            sessionTimeout: 10,
            maxTextLength: 5000,
            theme: 'system',
            animationsEnabled: true,
            compactMode: false,
            enableTelemetry: false,
            debugMode: false
        };

        try {
            // Try to load settings from background script with timeout
            const response = await this.sendMessageWithRetry({ action: 'getSettings' }, 3);
            if (response && response.success) {
                this.settings = response.settings;
                console.log('Settings loaded from background script:', this.settings);
            } else {
                console.log('Using default settings - background response was unsuccessful');
            }
        } catch (error) {
            console.log('Using default settings - could not connect to background script:', error.message);
        }
    }

    async sendMessageWithRetry(message, maxRetries = 3, delayMs = 100) {
        // Check if chrome.runtime is available
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            throw new Error('Chrome runtime not available');
        }

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await chrome.runtime.sendMessage(message);
            } catch (error) {
                console.log(`Message attempt ${i + 1}/${maxRetries} failed:`, error.message);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
                // Wait before retrying with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
            }
        }
    }
    
    attachEventListeners() {
        // Text selection events
        document.addEventListener('mouseup', this.handleSelection.bind(this));
        document.addEventListener('keyup', this.handleSelection.bind(this));
        
        // Track selection changes for context menu support
        document.addEventListener('selectionchange', this.trackSelection.bind(this));
        
        // Hide tooltip on scroll or click outside
        document.addEventListener('scroll', this.hideTooltip.bind(this), true);
        document.addEventListener('mousedown', this.boundHandleClickOutside);
        
        // Handle window resize
        window.addEventListener('resize', this.hideTooltip.bind(this));
    }
    
    injectStyles() {
        if (document.getElementById('tone-adjuster-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'tone-adjuster-styles';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('content-styles.css');
        document.head.appendChild(link);
    }
    
    trackSelection() {
        // Don't overwrite selection context if tooltip is open or processing
        if (this.tooltip || this.isProcessing) {
            return;
        }
        
        // Track selection for context menu support (no tooltip)
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length >= 3) {
            const targetElement = this.getEditableElement(range.commonAncestorContainer);
            if (targetElement) {
                // Store selection context for potential context menu use
                // Include more context for robust text replacement
                this.lastSelection = {
                    text: selectedText,
                    element: targetElement,
                    range: range.cloneRange(),
                    startOffset: range.startOffset,
                    endOffset: range.endOffset,
                    timestamp: Date.now()
                };
                
                // For input/textarea, also store selection positions
                if (targetElement.tagName && 
                    ['INPUT', 'TEXTAREA'].includes(targetElement.tagName.toLowerCase())) {
                    this.lastSelection.selectionStart = targetElement.selectionStart;
                    this.lastSelection.selectionEnd = targetElement.selectionEnd;
                }
                
                console.log('Tracked selection:', this.lastSelection.text.substring(0, 50));
            }
        }
    }
    
    handleSelection(event) {
        // Debounce selection handling
        clearTimeout(this.selectionTimeout);
        this.selectionTimeout = setTimeout(() => {
            this.processSelection(event);
        }, 100);
    }
    
    processSelection(event) {
        // Don't process selection if tooltip is already open or we're processing
        if (this.tooltip || this.isProcessing || this.tooltipInteracting) {
            console.log('Skipping processSelection - tooltip active or processing');
            return;
        }
        
        const selection = window.getSelection();
        
        // Check if there's a valid selection
        if (!selection || selection.rangeCount === 0) {
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        // Only show tooltip for meaningful text selections
        if (!selectedText || selectedText.length < 3) {
            return;
        }
        
        // Check if selection is in an editable element
        const targetElement = this.getEditableElement(range.commonAncestorContainer);
        if (!targetElement) {
            return;
        }
        
        // Check if tooltip is enabled in settings
        if (this.settings && this.settings.showTooltip === false) {
            console.log('Tooltip disabled by user settings');
            return;
        }
        
        console.log('Creating new tooltip for selection:', selectedText.substring(0, 50));
        
        // Store selection details
        this.currentSelection = selection;
        this.selectedText = selectedText;
        this.targetElement = targetElement;
        this.selectionRange = range.cloneRange();
        
        // Show floating icon first, then expand to tooltip on interaction
        this.showFloatingIcon(range);
    }
    
    getEditableElement(node) {
        // Traverse up the DOM to find an editable element
        let current = node;
        
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const tagName = current.tagName.toLowerCase();
                
                // Check for input/textarea elements
                if (tagName === 'input' || tagName === 'textarea') {
                    const type = current.type || '';
                    // Only text-based inputs
                    if (tagName === 'textarea' || 
                        ['text', 'email', 'password', 'search', 'url'].includes(type)) {
                        return current;
                    }
                }
                
                // Check for contenteditable elements
                if (current.contentEditable === 'true') {
                    return current;
                }
            }
            
            current = current.parentNode;
        }
        
        return null;
    }
    
    showFloatingIcon(range) {
        // Create floating icon element
        this.floatingIcon = document.createElement('div');
        this.floatingIcon.className = 'tone-adjuster-floating-icon';
        this.floatingIcon.innerHTML = '🎨';
        this.floatingIcon.title = 'Tone Adjuster - Click to adjust tone';
        
        // Add to DOM
        document.body.appendChild(this.floatingIcon);
        
        // Position icon
        this.positionFloatingIcon(range);
        
        // Attach click listener to expand to full tooltip
        this.floatingIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideFloatingIcon();
            this.showTooltip(range);
        });
        
        // Auto-hide after 3 seconds if not interacted with
        this.iconTimeout = setTimeout(() => {
            if (this.floatingIcon) {
                this.hideFloatingIcon();
            }
        }, 3000);
        
        // Animate in
        requestAnimationFrame(() => {
            if (this.floatingIcon) {
                this.floatingIcon.classList.add('visible');
            }
        });
    }
    
    positionFloatingIcon(range) {
        if (!this.floatingIcon) return;
        
        const rect = range.getBoundingClientRect();
        const icon = this.floatingIcon;
        
        // Position to the right of the selection
        let left = rect.right + window.scrollX + 8;
        let top = rect.top + window.scrollY + (rect.height / 2) - 12; // Center vertically
        
        // Ensure icon stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal bounds checking
        if (left + 24 > viewportWidth - 10) {
            // Show on the left side instead
            left = rect.left + window.scrollX - 32;
        }
        
        // Vertical bounds checking
        if (top < 10) {
            top = 10;
        } else if (top + 24 > viewportHeight - 10) {
            top = viewportHeight - 34;
        }
        
        icon.style.left = `${left}px`;
        icon.style.top = `${top}px`;
    }
    
    hideFloatingIcon() {
        if (this.floatingIcon) {
            this.floatingIcon.classList.remove('visible');
            
            setTimeout(() => {
                if (this.floatingIcon && this.floatingIcon.parentNode) {
                    this.floatingIcon.parentNode.removeChild(this.floatingIcon);
                }
                this.floatingIcon = null;
            }, 200);
        }
        
        if (this.iconTimeout) {
            clearTimeout(this.iconTimeout);
            this.iconTimeout = null;
        }
    }
    
    showTooltip(range) {
        // Remove document click listener to prevent interference
        document.removeEventListener('mousedown', this.boundHandleClickOutside);
        console.log('Document mousedown listener removed for tooltip interaction');
        
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tone-adjuster-tooltip';
        this.tooltip.appendChild(this.createTooltipContent());
        
        // Add to DOM
        document.body.appendChild(this.tooltip);
        
        // Position tooltip
        this.positionTooltip(range);
        
        // Attach event listeners
        this.attachTooltipListeners();
        
        // Set interaction flag
        this.tooltipInteracting = true;
        
        // Animate in
        requestAnimationFrame(() => {
            this.tooltip.classList.add('visible');
        });
    }
    
    createTooltipContent() {
        // Create content container
        const container = document.createElement('div');
        
        // Create header
        const header = document.createElement('div');
        header.className = 'tooltip-header';
        
        const title = document.createElement('span');
        title.className = 'tooltip-title';
        title.textContent = 'Adjust Tone';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = '&times;';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create tone buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'tone-buttons';
        
        this.tones.forEach(tone => {
            const button = document.createElement('button');
            button.className = 'tone-btn';
            button.dataset.tone = tone.id;
            button.title = `Adjust to ${tone.label} tone`;
            
            const icon = document.createElement('span');
            icon.className = 'tone-icon';
            icon.textContent = tone.icon;
            
            const label = document.createElement('span');
            label.className = 'tone-label';
            label.textContent = tone.label;
            
            button.appendChild(icon);
            button.appendChild(label);
            buttonsContainer.appendChild(button);
        });
        
        // Create processing state
        const processingState = document.createElement('div');
        processingState.className = 'processing-state';
        processingState.style.display = 'none';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const processingText = document.createElement('span');
        processingText.className = 'processing-text';
        processingText.textContent = 'Adjusting tone...';
        
        processingState.appendChild(spinner);
        processingState.appendChild(processingText);
        
        // Create preview section
        const previewSection = document.createElement('div');
        previewSection.className = 'preview-section';
        previewSection.style.display = 'none';
        
        const previewHeader = document.createElement('div');
        previewHeader.className = 'preview-header';
        
        const previewTitle = document.createElement('span');
        previewTitle.className = 'preview-title';
        previewTitle.textContent = 'Preview';
        
        previewHeader.appendChild(previewTitle);
        
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        
        const previewActions = document.createElement('div');
        previewActions.className = 'preview-actions';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-btn';
        acceptBtn.textContent = 'Accept';
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject-btn';
        rejectBtn.textContent = 'Try Again';
        
        previewActions.appendChild(acceptBtn);
        previewActions.appendChild(rejectBtn);
        
        previewSection.appendChild(previewHeader);
        previewSection.appendChild(previewContent);
        previewSection.appendChild(previewActions);
        
        // Assemble all parts
        container.appendChild(header);
        container.appendChild(buttonsContainer);
        container.appendChild(processingState);
        container.appendChild(previewSection);
        
        return container;
    }
    
    positionTooltip(range) {
        const rect = range.getBoundingClientRect();
        const tooltip = this.tooltip;
        
        // Initial positioning above the selection
        let top = rect.top + window.scrollY - tooltip.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);
        
        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal bounds checking
        if (left < 10) {
            left = 10;
        } else if (left + tooltip.offsetWidth > viewportWidth - 10) {
            left = viewportWidth - tooltip.offsetWidth - 10;
        }
        
        // Vertical bounds checking - if not enough space above, show below
        if (top < 10) {
            top = rect.bottom + window.scrollY + 10;
            tooltip.classList.add('below');
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    attachTooltipListeners() {
        if (!this.tooltip) return;
        
        // Close button
        const closeBtn = this.tooltip.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                console.log('Close button clicked');
                this.hideTooltip();
            });
        }
        
        // Tone adjustment buttons
        const toneButtons = this.tooltip.querySelectorAll('.tone-btn');
        toneButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tone = e.currentTarget.dataset.tone;
                console.log(`Tone button clicked: ${tone}`);
                this.adjustTone(tone);
            });
        });
        
        // Preview action buttons  
        const acceptBtn = this.tooltip.querySelector('.accept-btn');
        const rejectBtn = this.tooltip.querySelector('.reject-btn');
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                this.acceptAdjustment();
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', (e) => {
                this.showToneButtons();
            });
        }
        
        console.log('Tooltip event listeners attached');
    }
    
    async adjustTone(tone) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showProcessingState();
        
        try {
            // Validate inputs
            if (!this.selectedText || this.selectedText.trim().length === 0) {
                throw new Error('No text selected');
            }
            
            if (!tone || typeof tone !== 'string') {
                throw new Error('Invalid tone specified');
            }
            
            console.log(`Starting tone adjustment: ${tone} for "${this.selectedText.substring(0, 50)}..."`);
            
            // Send message to background script for AI processing with retry
            const response = await this.sendMessageWithRetry({
                action: 'rewriteText',
                text: this.selectedText,
                tone: tone
            }, 5, 200); // More retries and longer delay for AI processing
            
            if (!response) {
                throw new Error('No response received from background script');
            }
            
            if (response.success) {
                if (!response.adjustedText) {
                    throw new Error('No adjusted text received');
                }
                console.log(`Tone adjustment completed: "${response.adjustedText.substring(0, 50)}..."`);
                this.showPreview(response.adjustedText, tone);
            } else {
                this.showError(response.error || 'Failed to adjust tone');
            }
        } catch (error) {
            console.error('Tone adjustment error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Unable to adjust tone';
            if (error.message.includes('No text selected')) {
                errorMessage = 'Please select some text first';
            } else if (error.message.includes('connect')) {
                errorMessage = 'Connection error - please try again';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out - please try again';
            }
            
            this.showError(errorMessage);
        } finally {
            this.isProcessing = false;
        }
    }
    
    showProcessingState() {
        if (!this.tooltip) return;
        
        const toneButtons = this.tooltip.querySelector('.tone-buttons');
        const processingState = this.tooltip.querySelector('.processing-state');
        
        if (toneButtons && processingState) {
            toneButtons.style.display = 'none';
            processingState.style.display = 'flex';
        }
    }
    
    showPreview(adjustedText, tone) {
        if (!this.tooltip) return;
        
        // Store adjusted text for potential acceptance
        this.adjustedText = adjustedText;
        this.adjustedTone = tone;
        this.originalText = this.selectedText; // Store for undo
        
        // Check if auto-accept is enabled (instant mode)
        if (this.settings && this.settings.autoAccept) {
            console.log('Auto-accepting adjustment due to user settings');
            this.acceptAdjustment();
            this.showPostAdjustmentUI();
            return;
        }
        
        const processingState = this.tooltip.querySelector('.processing-state');
        const previewSection = this.tooltip.querySelector('.preview-section');
        const previewContent = this.tooltip.querySelector('.preview-content');
        
        if (processingState && previewSection && previewContent) {
            processingState.style.display = 'none';
            previewSection.style.display = 'block';
            
            // Set the adjusted text (textContent is already safe from XSS)
            previewContent.textContent = adjustedText;
        }
    }
    
    showToneButtons() {
        if (!this.tooltip) return;
        
        const toneButtons = this.tooltip.querySelector('.tone-buttons');
        const processingState = this.tooltip.querySelector('.processing-state');
        const previewSection = this.tooltip.querySelector('.preview-section');
        
        if (toneButtons) {
            toneButtons.style.display = 'grid';
        }
        
        if (processingState) {
            processingState.style.display = 'none';
        }
        
        if (previewSection) {
            previewSection.style.display = 'none';
        }
    }
    
    showError(errorMessage) {
        if (!this.tooltip) return;
        
        const processingState = this.tooltip.querySelector('.processing-state');
        
        if (processingState) {
            // Clear existing content safely
            processingState.textContent = '';
            
            const errorState = document.createElement('div');
            errorState.className = 'error-state';
            
            const errorIcon = document.createElement('span');
            errorIcon.className = 'error-icon';
            errorIcon.textContent = '⚠️';
            
            const errorText = document.createElement('span');
            errorText.className = 'error-text';
            errorText.textContent = errorMessage;
            
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.textContent = 'Try Again';
            retryBtn.addEventListener('click', this.showToneButtons.bind(this));
            
            errorState.appendChild(errorIcon);
            errorState.appendChild(errorText);
            errorState.appendChild(retryBtn);
            
            processingState.appendChild(errorState);
        }
    }
    
    acceptAdjustment() {
        if (!this.adjustedText || !this.selectionRange) return;
        
        try {
            // Replace the selected text with adjusted text
            this.replaceSelectedText(this.adjustedText);
            
            // If not in instant mode, hide tooltip and show success
            if (!this.settings?.autoAccept) {
                this.hideTooltip();
                this.showSuccessFeedback();
            }
        } catch (error) {
            console.error('Failed to replace text:', error);
            this.showError('Failed to replace text');
        }
    }
    
    showPostAdjustmentUI() {
        if (!this.tooltip) return;
        
        // Clear existing content safely
        const container = this.tooltip.querySelector('div');
        if (container) {
            container.textContent = '';
        }
        
        // Create post-adjustment UI
        const header = document.createElement('div');
        header.className = 'tooltip-header';
        
        const title = document.createElement('span');
        title.className = 'tooltip-title';
        title.textContent = `✓ ${this.adjustedTone} tone applied`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = '&times;';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'post-adjustment-actions';
        
        const undoBtn = document.createElement('button');
        undoBtn.className = 'undo-btn';
        undoBtn.textContent = '↶ Undo';
        undoBtn.title = 'Restore original text';
        
        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'regenerate-btn';
        regenerateBtn.textContent = '🔄 Re-generate';
        regenerateBtn.title = 'Try a different variation';
        
        actionsContainer.appendChild(undoBtn);
        actionsContainer.appendChild(regenerateBtn);
        
        // Assemble UI
        if (container) {
            container.appendChild(header);
            container.appendChild(actionsContainer);
        }
        
        // Attach event listeners
        closeBtn.addEventListener('click', () => this.hideTooltip());
        undoBtn.addEventListener('click', () => this.undoAdjustment());
        regenerateBtn.addEventListener('click', () => this.regenerateAdjustment());
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (this.tooltip) {
                this.hideTooltip();
            }
        }, 5000);
    }
    
    undoAdjustment() {
        if (!this.originalText || !this.targetElement) return;
        
        try {
            // Replace with original text
            this.replaceSelectedText(this.originalText);
            this.hideTooltip();
            
            // Show undo feedback
            this.showUndoFeedback();
        } catch (error) {
            console.error('Failed to undo adjustment:', error);
        }
    }
    
    regenerateAdjustment() {
        if (!this.adjustedTone) return;
        
        // Hide the post-adjustment UI and restart the process
        this.hideTooltip();
        
        // Re-trigger the tone adjustment for the same tone
        setTimeout(() => {
            this.adjustTone(this.adjustedTone);
        }, 100);
    }
    
    showUndoFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'tone-adjuster-success undo-feedback';
        
        const undoIcon = document.createElement('span');
        undoIcon.className = 'success-icon';
        undoIcon.textContent = '↶';
        
        const undoText = document.createElement('span');
        undoText.className = 'success-text';
        undoText.textContent = 'Changes undone';
        
        feedback.appendChild(undoIcon);
        feedback.appendChild(undoText);
        
        document.body.appendChild(feedback);
        
        // Position near the target element or center
        if (this.targetElement && document.contains(this.targetElement)) {
            try {
                const rect = this.targetElement.getBoundingClientRect();
                feedback.style.left = `${rect.left + window.scrollX}px`;
                feedback.style.top = `${rect.bottom + window.scrollY + 5}px`;
            } catch (error) {
                feedback.style.left = '50%';
                feedback.style.top = '100px';
                feedback.style.transform = 'translateX(-50%)';
            }
        } else {
            feedback.style.left = '50%';
            feedback.style.top = '100px';
            feedback.style.transform = 'translateX(-50%)';
        }
        
        // Animate
        requestAnimationFrame(() => {
            feedback.classList.add('visible');
        });
        
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    replaceSelectedText(newText) {
        if (!this.selectionRange || !this.targetElement) return;
        
        // Handle different types of editable elements
        const tagName = this.targetElement.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            // For input/textarea elements
            const start = this.targetElement.selectionStart;
            const end = this.targetElement.selectionEnd;
            const value = this.targetElement.value;
            
            this.targetElement.value = 
                value.substring(0, start) + 
                newText + 
                value.substring(end);
            
            // Set cursor position after replaced text
            const newCursorPos = start + newText.length;
            this.targetElement.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event for any listeners
            this.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // For contenteditable elements, including complex ones like Twitter/Draft.js
            if (this.isTwitterEditor(this.targetElement)) {
                this.replaceInTwitterEditor(newText);
            } else {
                // Standard contenteditable replacement
                this.selectionRange.deleteContents();
                this.selectionRange.insertNode(document.createTextNode(newText));
                
                // Clear selection and position cursor
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(this.selectionRange);
                selection.collapseToEnd();
            }
        }
        
        // Focus the element
        this.targetElement.focus();
    }
    
    isTwitterEditor(element) {
        // Check for Twitter's Draft.js editor indicators
        return element.hasAttribute('data-testid') && 
               element.getAttribute('data-testid').includes('tweetTextarea') ||
               element.classList.contains('public-DraftEditor-content') ||
               element.closest('[data-testid*="tweetTextarea"]') ||
               element.closest('.public-DraftEditor-content');
    }
    
    replaceInTwitterEditor(newText) {
        try {
            // For Twitter's Draft.js editor, we need to simulate user input more accurately
            // Find the text span with data-text="true"
            const textSpan = this.targetElement.querySelector('[data-text="true"]') ||
                           this.selectionRange.commonAncestorContainer.closest('[data-text="true"]') ||
                           this.selectionRange.startContainer.parentElement?.closest('[data-text="true"]');
            
            if (textSpan) {
                // Method 1: Use execCommand for better Draft.js compatibility
                const oldText = textSpan.textContent;
                const startIndex = oldText.indexOf(this.selectedText);
                
                if (startIndex !== -1) {
                    // Create a proper selection range for the text to replace
                    const selection = window.getSelection();
                    const range = document.createRange();
                    
                    // Find the exact text node and position
                    const textNode = textSpan.firstChild || textSpan;
                    if (textNode.nodeType === Node.TEXT_NODE) {
                        range.setStart(textNode, startIndex);
                        range.setEnd(textNode, startIndex + this.selectedText.length);
                        
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // Use execCommand which Draft.js handles better
                        document.execCommand('insertText', false, newText);
                        
                        console.log('Twitter editor execCommand replacement completed');
                        return true;
                    }
                }
            }
            
            // Method 2: Simulate keystrokes for better Draft.js integration
            if (this.selectionRange && this.targetElement) {
                // Focus the editor first
                this.targetElement.focus();
                
                // Create and select the range
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(this.selectionRange);
                
                // Try to trigger beforeinput event (Draft.js listens for this)
                const beforeInputEvent = new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertReplacementText',
                    data: newText
                });
                
                const eventHandled = this.targetElement.dispatchEvent(beforeInputEvent);
                
                if (!eventHandled || beforeInputEvent.defaultPrevented) {
                    // If beforeinput was handled/prevented, Draft.js might have processed it
                    console.log('Twitter editor beforeinput event was handled by Draft.js');
                    return true;
                } else {
                    // Fall back to execCommand
                    document.execCommand('insertText', false, newText);
                    console.log('Twitter editor execCommand fallback completed');
                    return true;
                }
            }
            
            // Method 3: Direct content manipulation with proper events
            if (textSpan) {
                const oldText = textSpan.textContent;
                const startIndex = oldText.indexOf(this.selectedText);
                
                if (startIndex !== -1) {
                    const beforeText = oldText.substring(0, startIndex);
                    const afterText = oldText.substring(startIndex + this.selectedText.length);
                    const newFullText = beforeText + newText + afterText;
                    
                    // Update the text content
                    textSpan.textContent = newFullText;
                    
                    // Dispatch input event specifically for Draft.js
                    const inputEvent = new InputEvent('input', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertReplacementText',
                        data: newText
                    });
                    
                    this.targetElement.dispatchEvent(inputEvent);
                    
                    // Also try composition events which Draft.js uses
                    this.targetElement.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
                    this.targetElement.dispatchEvent(new CompositionEvent('compositionend', { 
                        bubbles: true, 
                        data: newText 
                    }));
                    
                    // Set cursor position after the replaced text
                    const selection = window.getSelection();
                    const range = document.createRange();
                    const newPosition = beforeText.length + newText.length;
                    
                    if (textSpan.firstChild) {
                        range.setStart(textSpan.firstChild, Math.min(newPosition, textSpan.textContent.length));
                        range.setEnd(textSpan.firstChild, Math.min(newPosition, textSpan.textContent.length));
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    console.log('Twitter editor direct manipulation completed');
                    return true;
                }
            }
            
        } catch (error) {
            console.error('Twitter editor replacement failed:', error);
            
            // Final fallback: Try mutation and re-trigger React reconciliation
            try {
                const currentText = this.targetElement.textContent || this.targetElement.innerText;
                if (currentText && currentText.includes(this.selectedText)) {
                    // Find the Draft.js editor container to trigger React updates
                    const draftContainer = this.targetElement.closest('[data-testid*="tweetTextarea"]') || 
                                         this.targetElement.closest('.public-DraftEditor-content');
                    
                    if (draftContainer) {
                        // Temporarily store the current content
                        const currentContent = this.targetElement.innerHTML;
                        const newContent = currentContent.replace(this.selectedText, newText);
                        
                        this.targetElement.innerHTML = newContent;
                        
                        // Force React to notice the change by dispatching multiple events
                        const events = [
                            new Event('input', { bubbles: true }),
                            new Event('change', { bubbles: true }),
                            new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: newText }),
                            new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
                            new KeyboardEvent('keyup', { bubbles: true, key: 'a' })
                        ];
                        
                        events.forEach(event => {
                            this.targetElement.dispatchEvent(event);
                        });
                        
                        // Focus and click to trigger React
                        this.targetElement.focus();
                        this.targetElement.click();
                        
                        console.log('Twitter editor final fallback completed');
                        return true;
                    }
                }
            } catch (fallbackError) {
                console.error('Twitter editor final fallback failed:', fallbackError);
            }
        }
        
        return false;
    }
    
    showSuccessFeedback() {
        if (this.targetElement) {
            this.showSuccessFeedbackForElement(this.targetElement);
        } else {
            // Fallback: show feedback in center of screen
            this.showSuccessFeedbackAtPosition(window.innerWidth / 2, 100);
        }
    }
    
    showSuccessFeedbackForElement(element) {
        if (!element || !document.contains(element)) {
            this.showSuccessFeedbackAtPosition(window.innerWidth / 2, 100);
            return;
        }
        
        const feedback = this.createSuccessFeedback();
        document.body.appendChild(feedback);
        
        try {
            // Position near the target element
            const rect = element.getBoundingClientRect();
            feedback.style.left = `${rect.left + window.scrollX}px`;
            feedback.style.top = `${rect.bottom + window.scrollY + 5}px`;
        } catch (error) {
            console.warn('Could not position feedback near element:', error);
            // Fallback positioning
            feedback.style.left = '50px';
            feedback.style.top = '100px';
        }
        
        this.animateSuccessFeedback(feedback);
    }
    
    showSuccessFeedbackAtPosition(x, y) {
        const feedback = this.createSuccessFeedback();
        document.body.appendChild(feedback);
        
        feedback.style.left = `${x - 100}px`; // Center the feedback
        feedback.style.top = `${y}px`;
        
        this.animateSuccessFeedback(feedback);
    }
    
    createSuccessFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'tone-adjuster-success';
        
        const successIcon = document.createElement('span');
        successIcon.className = 'success-icon';
        successIcon.textContent = '✓';
        
        const successText = document.createElement('span');
        successText.className = 'success-text';
        successText.textContent = 'Tone adjusted successfully';
        
        feedback.appendChild(successIcon);
        feedback.appendChild(successText);
        
        return feedback;
    }
    
    animateSuccessFeedback(feedback) {
        // Animate in and out
        requestAnimationFrame(() => {
            feedback.classList.add('visible');
        });
        
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    showContextMenuSuccessFeedback(element, tone) {
        const feedback = document.createElement('div');
        feedback.className = 'tone-adjuster-success context-menu-success';
        
        const successIcon = document.createElement('span');
        successIcon.className = 'success-icon';
        successIcon.textContent = '✓';
        
        const successText = document.createElement('span');
        successText.className = 'success-text';
        successText.textContent = `Text adjusted to ${tone} tone!`;
        
        feedback.appendChild(successIcon);
        feedback.appendChild(successText);
        
        document.body.appendChild(feedback);
        
        // Position based on element or use center of screen
        if (element && document.contains(element)) {
            try {
                const rect = element.getBoundingClientRect();
                feedback.style.left = `${rect.left + window.scrollX}px`;
                feedback.style.top = `${rect.bottom + window.scrollY + 5}px`;
            } catch (error) {
                // Fallback to center
                feedback.style.left = '50%';
                feedback.style.top = '100px';
                feedback.style.transform = 'translateX(-50%)';
            }
        } else {
            // Center on screen
            feedback.style.left = '50%';
            feedback.style.top = '100px';
            feedback.style.transform = 'translateX(-50%)';
        }
        
        // Animate with slightly longer duration for context menu feedback
        requestAnimationFrame(() => {
            feedback.classList.add('visible');
        });
        
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000); // Show for 3 seconds instead of 2
    }
    
    replaceTextInElement(element, originalText, newText, selectionInfo) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            // For input/textarea elements, use stored selection positions if available
            if (selectionInfo && 
                typeof selectionInfo.selectionStart === 'number' && 
                typeof selectionInfo.selectionEnd === 'number') {
                
                const value = element.value;
                const selectedText = value.substring(selectionInfo.selectionStart, selectionInfo.selectionEnd);
                
                if (selectedText.trim() === originalText.trim()) {
                    element.value = 
                        value.substring(0, selectionInfo.selectionStart) + 
                        newText + 
                        value.substring(selectionInfo.selectionEnd);
                    
                    // Set cursor position after replaced text
                    const newCursorPos = selectionInfo.selectionStart + newText.length;
                    element.setSelectionRange(newCursorPos, newCursorPos);
                    
                    // Trigger input event
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();
                    return true;
                }
            }
            
            // Fallback: search and replace in the value
            const value = element.value;
            if (value.includes(originalText)) {
                element.value = value.replace(originalText, newText);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.focus();
                return true;
            }
        } else if (element.contentEditable === 'true') {
            // Check if this is a Twitter editor
            if (this.isTwitterEditor(element)) {
                return this.replaceInTwitterEditorByText(element, originalText, newText);
            } else {
                // For standard contenteditable elements
                const textContent = element.textContent || element.innerText || '';
                if (textContent.includes(originalText)) {
                    element.innerHTML = element.innerHTML.replace(originalText, newText);
                    element.focus();
                    return true;
                }
            }
        }
        
        return false;
    }
    
    replaceInTwitterEditorByText(element, originalText, newText) {
        try {
            // Find the text span with data-text="true" within this element
            const textSpan = element.querySelector('[data-text="true"]');
            
            if (textSpan && textSpan.textContent.includes(originalText)) {
                const oldText = textSpan.textContent;
                const newFullText = oldText.replace(originalText, newText);
                
                // Update the text content
                textSpan.textContent = newFullText;
                
                // Trigger events to notify Draft.js
                const events = ['input', 'textInput', 'beforeinput', 'compositionend', 'change'];
                events.forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    if (eventType === 'textInput' || eventType === 'beforeinput') {
                        event.data = newText;
                    }
                    element.dispatchEvent(event);
                });
                
                // Also trigger on the text span
                events.forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    textSpan.dispatchEvent(event);
                });
                
                element.focus();
                console.log('Twitter editor text replacement by text completed');
                return true;
            }
            
            // Fallback: try innerHTML replacement
            if (element.innerHTML.includes(originalText)) {
                element.innerHTML = element.innerHTML.replace(originalText, newText);
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.focus();
                console.log('Twitter editor innerHTML replacement completed');
                return true;
            }
            
        } catch (error) {
            console.error('Twitter editor text replacement failed:', error);
        }
        
        return false;
    }
    
    findAndReplaceText(originalText, newText) {
        // Search all editable elements for the original text
        const editableElements = document.querySelectorAll(
            'input[type="text"], input[type="email"], input[type="password"], ' +
            'input[type="search"], input[type="url"], textarea, [contenteditable="true"]'
        );
        
        for (const element of editableElements) {
            const tagName = element.tagName.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea') {
                if (element.value && element.value.includes(originalText)) {
                    element.value = element.value.replace(originalText, newText);
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();
                    this.showSuccessFeedbackForElement(element);
                    return true;
                }
            } else if (element.contentEditable === 'true') {
                const textContent = element.textContent || element.innerText || '';
                if (textContent.includes(originalText)) {
                    // Check if this is a Twitter editor
                    if (this.isTwitterEditor(element)) {
                        const success = this.replaceInTwitterEditorByText(element, originalText, newText);
                        if (success) {
                            this.showSuccessFeedbackForElement(element);
                            return true;
                        }
                    } else {
                        // Standard contenteditable replacement
                        element.innerHTML = element.innerHTML.replace(originalText, newText);
                        element.focus();
                        this.showSuccessFeedbackForElement(element);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    handleClickOutside(event) {
        if (!this.tooltip) return;
        
        // Check if click is within tooltip using multiple methods for safety
        const isWithinTooltip = this.tooltip.contains(event.target) || 
                               event.target.closest('.tone-adjuster-tooltip') ||
                               (event.composedPath && event.composedPath().includes(this.tooltip));
        
        if (isWithinTooltip) {
            // Click is within tooltip, don't hide
            console.log('Click within tooltip, keeping it open');
            return;
        }
        
        // Don't hide if currently processing
        if (this.isProcessing) {
            console.log('Processing in progress, keeping tooltip open');
            return;
        }
        
        // Don't hide if clicking on the selected text
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.toString().trim() === this.selectedText) {
                console.log('Clicked on selected text, keeping tooltip open');
                return;
            }
        }
        
        console.log('Clicking outside tooltip, hiding it');
        this.hideTooltip();
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
            
            setTimeout(() => {
                if (this.tooltip && this.tooltip.parentNode) {
                    this.tooltip.parentNode.removeChild(this.tooltip);
                }
                this.tooltip = null;
                
                // Re-add document listener after tooltip is completely removed
                document.addEventListener('mousedown', this.boundHandleClickOutside);
                console.log('Document mousedown listener re-added after tooltip removal');
            }, 200);
        }
        
        // Also hide floating icon if present
        this.hideFloatingIcon();
        
        // Reset state
        this.currentSelection = null;
        this.selectedText = '';
        this.targetElement = null;
        this.selectionRange = null;
        this.adjustedText = null;
        this.adjustedTone = null;
        this.originalText = null;
        this.isProcessing = false;
        this.tooltipInteracting = false;
    }
    
    /**
     * Handle settings changes
     */
    onSettingsChanged(newSettings) {
        console.log('Content script settings updated:', newSettings);
        
        // Apply any necessary changes based on new settings
        if (newSettings.debugMode) {
            console.log('Debug mode enabled in content script');
        }
        
        // If tooltip was disabled and we have an active tooltip, hide it
        if (newSettings.showTooltip === false && this.tooltip) {
            console.log('Hiding tooltip due to settings change');
            this.hideTooltip();
        }
    }
}

// Add message listener for background script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('🔄 Content script received message:', message.action, message);
    
    let hasResponded = false;
    
    // Helper function to ensure response is sent only once
    const safeResponse = (response) => {
        if (!hasResponded && sendResponse) {
            hasResponded = true;
            try {
                sendResponse(response);
            } catch (error) {
                console.error('Error sending response:', error);
            }
        }
    };
    
    try {
        if (message.action === 'checkAiAvailability') {
            checkAiAvailability().then(available => {
                safeResponse({ available });
            }).catch(error => {
                console.error('Content script AI check failed:', error);
                safeResponse({ available: false });
            });
            return true; // Keep message channel open for async response
        } else if (message.action === 'rewriteTextWithAI') {
            console.log('🎭 Processing rewriteTextWithAI request...');
            (async () => {
                try {
                    const result = await rewriteTextWithAI(message.text, message.tone);
                    console.log('✅ Text rewriting successful:', result.substring(0, 100) + '...');
                    safeResponse({ success: true, adjustedText: result });
                } catch (error) {
                    console.error('❌ Content script text rewriting failed:', error);
                    safeResponse({ success: false, error: error.message });
                }
            })();
            return true; // Keep message channel open for async response
        } else if (message.action === 'replaceText') {
            // Handle text replacement in the current page
            console.log('Received replaceText request:', message);
            try {
                if (toneAdjusterInstance) {
                    // Try to use current selection context first (tooltip workflow)
                    if (toneAdjusterInstance.targetElement && toneAdjusterInstance.selectionRange) {
                        // Use tooltip selection context
                        toneAdjusterInstance.adjustedText = message.newText;
                        toneAdjusterInstance.replaceSelectedText(message.newText);
                        toneAdjusterInstance.showSuccessFeedback();
                    } else if (toneAdjusterInstance.lastSelection && 
                               (Date.now() - toneAdjusterInstance.lastSelection.timestamp) < 10000) {
                        // Use tracked selection from context menu (within 10 seconds)
                        console.log('Using tracked selection for text replacement');
                        const lastSel = toneAdjusterInstance.lastSelection;
                        
                        // Validate the element still exists and is in the DOM
                        if (lastSel.element && document.contains(lastSel.element)) {
                            const success = toneAdjusterInstance.replaceTextInElement(
                                lastSel.element, 
                                message.originalText, 
                                message.newText, 
                                lastSel
                            );
                            
                            if (success) {
                                // Show enhanced success feedback for context menu usage
                                toneAdjusterInstance.showContextMenuSuccessFeedback(lastSel.element, message.tone);
                            } else {
                                console.warn('Text replacement failed, trying fallback search');
                                const found = toneAdjusterInstance.findAndReplaceText(message.originalText, message.newText);
                                if (found) {
                                    toneAdjusterInstance.showContextMenuSuccessFeedback(null, message.tone);
                                }
                            }
                        } else {
                            console.warn('Tracked element no longer valid');
                        }
                        
                        // Clear the used selection
                        toneAdjusterInstance.lastSelection = null;
                    } else {
                        // Fallback: search for the original text in all editable elements
                        console.log('Searching for text to replace:', message.originalText.substring(0, 50));
                        const found = toneAdjusterInstance.findAndReplaceText(message.originalText, message.newText);
                        if (found) {
                            toneAdjusterInstance.showContextMenuSuccessFeedback(null, message.tone);
                        } else {
                            console.warn('Could not find text to replace');
                        }
                    }
                } else {
                    console.error('ToneAdjuster instance not available');
                }
                safeResponse({ success: true });
            } catch (error) {
                console.error('Text replacement failed:', error);
                safeResponse({ success: false, error: error.message });
            }
            return false; // Synchronous response
        } else if (message.action === 'adjustToneFromContextMenu') {
            // Handle tone adjustment from context menu
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText.length > 2 && toneAdjusterInstance) {
                // Re-use the existing logic
                toneAdjusterInstance.currentSelection = selection;
                toneAdjusterInstance.selectedText = selectedText;
                toneAdjusterInstance.targetElement = toneAdjusterInstance.getEditableElement(selection.getRangeAt(0).commonAncestorContainer);
                toneAdjusterInstance.selectionRange = selection.getRangeAt(0).cloneRange();
                
                toneAdjusterInstance.adjustTone(message.tone);
            }
            // No response needed, this is a one-way command
            return false;
        } else if (message.action === 'settingsChanged') {
            // Handle settings change notification
            console.log('Settings changed in content script:', message.settings);
            if (toneAdjusterInstance && message.settings) {
                toneAdjusterInstance.settings = message.settings;
                toneAdjusterInstance.onSettingsChanged(message.settings);
            }
            safeResponse({ success: true });
            return false; // Response sent
        } else if (message.action === 'error') {
            // Handle error messages from background script
            console.error('Background script error:', message.message);
            // Send acknowledgment even for error messages
            safeResponse({ received: true });
            return false; // Response sent
        } else {
            // Handle unknown actions
            console.warn('Unknown action received:', message.action);
            safeResponse({ success: false, error: 'Unknown action: ' + message.action });
            return false; // Response sent
        }
    } catch (error) {
        console.error('Message handler error:', error);
        safeResponse({ success: false, error: 'Message handler error: ' + error.message });
        return false; // Response sent
    }
});

// AI availability check function for content script
async function checkAiAvailability() {
    try {
        if (typeof LanguageModel === 'undefined') {
            console.log('LanguageModel global not available');
            return false;
        }
        
        // Check model availability
        const availability = await LanguageModel.availability();
        console.log('AI availability status:', availability);
        
        return availability === 'readily' || availability === 'available';
    } catch (error) {
        console.error('AI availability check failed:', error);
        return false;
    }
}

// AI text rewriting function for content script
let aiSessions = {}; // Store different sessions by tone type
let sessionTimeouts = {};

function getSessionIdleTime() {
    // Get timeout from settings or use default
    const timeoutMinutes = (toneAdjusterInstance?.settings?.sessionTimeout) || 10;
    return timeoutMinutes * 60 * 1000; // Convert to milliseconds
}

async function rewriteTextWithAI(text, tone) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('No text provided');
        }

        const session = await ensureAISession(tone);
        
        // Create simple prompt - the AI session already has the examples and instructions
        const prompt = createPrompt(text, tone);
        
        console.log(`Rewriting text with ${tone} tone:`, text.substring(0, 50) + '...');
        
        const response = await session.prompt(prompt);
        
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }

        // Clean up response - remove common artifacts
        const cleanedResponse = cleanResponse(response);
        
        return cleanedResponse;
    } catch (error) {
        console.error('Text rewriting failed:', error);
        
        // Reset session on any failure (following sample extension pattern)
        console.log('Prompt failed, resetting session');
        await resetAISession(tone);
        
        // Try once more with fresh session
        try {
            const retrySession = await ensureAISession(tone);
            const prompt = createPrompt(text, tone);
            const response = await retrySession.prompt(prompt);
            
            if (response && response.trim().length > 0) {
                console.log('Retry succeeded after session reset');
                return cleanResponse(response);
            }
        } catch (retryError) {
            console.error('Retry also failed:', retryError);
        }
        
        throw error;
    }
}

function getInitialPromptsForTone(tone) {
    const prompts = {
        polish: {
            system: `You are an expert text rewriter that polishes text by correcting grammar, spelling, and improving clarity.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Fix grammatical errors, spelling mistakes, and improve sentence structure.
3. Maintain the original meaning and tone while making it more polished.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in a polished tone: 'Their going to the store tommorrow.'" },
                { role: 'assistant', content: "They're going to the store tomorrow." },
                { role: 'user', content: "Rewrite in a polished tone: 'I seen the report you sended me.'" },
                { role: 'assistant', content: "I've reviewed the report you sent me." },
                { role: 'user', content: "Rewrite in a polished tone: 'We should of went to the meeting earlier.'" },
                { role: 'assistant', content: "We should have gone to the meeting earlier." }
            ]
        },
        
        engaging: {
            system: `You are an expert text rewriter that adjusts tone to be engaging and captivating for social media.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Use compelling language that encourages interaction and engagement.
3. Add energy, curiosity, and social media appeal while maintaining clarity.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in an engaging tone: 'Check out our new product launch.'" },
                { role: 'assistant', content: "🚀 You won't believe what we just dropped! Our latest game-changer is here!" },
                { role: 'user', content: "Rewrite in an engaging tone: 'Thanks for your feedback.'" },
                { role: 'assistant', content: "Your feedback just made our day! 🙌 Keep the insights coming!" },
                { role: 'user', content: "Rewrite in an engaging tone: 'Let me know what you think.'" },
                { role: 'assistant', content: "Drop your thoughts below! 👇 We're dying to know what you think!" }
            ]
        },
        
        friendly: {
            system: `You are an expert text rewriter that adjusts tone to be warm, friendly, and approachable.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Add warmth and enthusiasm while maintaining professionalism.
3. Use positive language and inclusive phrasing.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in a friendly tone: 'Your request has been processed.'" },
                { role: 'assistant', content: "Great news! We've processed your request and everything looks good." },
                { role: 'user', content: "Rewrite in a friendly tone: 'The deadline is tomorrow.'" },
                { role: 'assistant', content: "Just a friendly reminder that we're aiming for tomorrow!" },
                { role: 'user', content: "Rewrite in a friendly tone: 'Please complete the form.'" },
                { role: 'assistant', content: "When you have a moment, could you help us out by completing this form?" }
            ]
        },
        
        confident: {
            system: `You are an expert text rewriter that adjusts tone to be confident, decisive, and assertive.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Remove uncertain language like "maybe," "might," "I think."
3. Use strong, decisive statements and action-oriented language.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in a confident tone: 'I think maybe we could try this approach.'" },
                { role: 'assistant', content: "We will implement this approach." },
                { role: 'user', content: "Rewrite in a confident tone: 'I'm not sure, but I believe this works.'" },
                { role: 'assistant', content: "This solution works effectively." },
                { role: 'user', content: "Rewrite in a confident tone: 'We might want to consider this option.'" },
                { role: 'assistant', content: "We should pursue this option." }
            ]
        },
        
        concise: {
            system: `You are an expert text rewriter that makes text concise while preserving all important information.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Remove unnecessary words, redundancy, and filler phrases.
3. Keep the core message intact while shortening the text significantly.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in a concise tone: 'I wanted to reach out to see if you might be available for a quick chat.'" },
                { role: 'assistant', content: "Are you available for a quick chat?" },
                { role: 'user', content: "Rewrite in a concise tone: 'In my opinion, we should probably start working on this project.'" },
                { role: 'assistant', content: "We should start this project." },
                { role: 'user', content: "Rewrite in a concise tone: 'I would like to thank you very much for all of your help with this matter.'" },
                { role: 'assistant', content: "Thank you for your help." }
            ]
        },
        
        unhinged: {
            system: `You are an expert text rewriter that adjusts tone to be wildly unhinged and dramatically exaggerated.
Follow these rules:
1. First, silently correct any spelling or grammatical errors in the original text.
2. Use unexpected metaphors, irrational logic, and intense emotional language.
3. Add chaos, urgency, and theatrical elements while keeping it humorous.
4. Always output only the rewritten sentence. Never explain your reasoning.`,
            examples: [
                { role: 'user', content: "Rewrite in an unhinged tone: 'I am slightly annoyed by the delay.'" },
                { role: 'assistant', content: "My soul is clawing at the walls because time itself has betrayed me!" },
                { role: 'user', content: "Rewrite in an unhinged tone: 'I am happy about the new coffee shop opening.'" },
                { role: 'assistant', content: "The caffeine gods have descended and my bloodstream is already vibrating in prophecy!" },
                { role: 'user', content: "Rewrite in an unhinged tone: 'I am worried about the storm tonight.'" },
                { role: 'assistant', content: "The sky is plotting a violent opera and I'm the unwilling main character!" }
            ]
        }
    };
    
    const toneConfig = prompts[tone];
    if (!toneConfig) {
        throw new Error(`Unknown tone: ${tone}`);
    }
    
    // Build the initialPrompts array
    const initialPrompts = [
        { role: 'system', content: toneConfig.system },
        ...toneConfig.examples
    ];
    
    return initialPrompts;
}

async function ensureAISession(tone) {
    const sessionKey = tone || 'default';
    
    if (!aiSessions[sessionKey]) {
        try {
            console.log(`Creating AI session for ${tone} tone...`);
            
            // Check availability first
            const available = await checkAiAvailability();
            if (!available) {
                throw new Error('AI not available');
            }
            
            // Get default parameters asynchronously but don't block on complex initialization
            const params = await LanguageModel.params();
            
            // Configure parameters based on tone
            const toneConfig = getToneParameters(tone, params);
            
            // Get initial prompts for this tone
            const initialPrompts = getInitialPromptsForTone(tone);
            
            // Create session with role-based prompts and parameters
            const sessionConfig = {
                temperature: toneConfig.temperature,
                topK: toneConfig.topK,
                initialPrompts: initialPrompts
            };
            
            aiSessions[sessionKey] = await LanguageModel.create(sessionConfig);
            
            console.log(`AI session created for ${tone} tone:`, toneConfig);
        } catch (error) {
            console.error('Failed to create AI session:', error);
            throw new Error('AI session creation failed: ' + error.message);
        }
    }
    
    // Reset session timeout for this specific session
    resetSessionTimeout(sessionKey);
    
    return aiSessions[sessionKey];
}

// This function was moved to createEnhancedPrompt for better performance
// Keeping the structure for potential future use with initialPrompts if needed

function getToneParameters(tone, defaultParams) {
    // Use creativity setting from user preferences
    const userCreativity = (toneAdjusterInstance?.settings?.creativity) || 0.8;
    const baseTemp = userCreativity;
    const baseTopK = defaultParams.defaultTopK || 8;
    const maxTemp = defaultParams.maxTemperature || 2.0;
    const maxTopK = defaultParams.maxTopK || 40;
    
    const configs = {
        // Lower creativity - focus on correctness
        polish: {
            temperature: Math.max(Math.min(baseTemp * 0.3, maxTemp), 0.1),
            topK: Math.max(Math.min(baseTopK - 5, maxTopK), 1)
        },
        
        // High creativity - vibrant and captivating
        engaging: {
            temperature: Math.min(baseTemp * 1.2, maxTemp),
            topK: Math.min(baseTopK + 2, maxTopK)
        },
        
        // Moderate-high creativity - warm variations
        friendly: {
            temperature: Math.min(baseTemp * 0.8, maxTemp),
            topK: Math.min(baseTopK, maxTopK)
        },
        
        // Lower creativity - decisive and direct
        confident: {
            temperature: Math.max(Math.min(baseTemp * 0.4, maxTemp), 0.2),
            topK: Math.max(Math.min(baseTopK - 4, maxTopK), 2)
        },
        
        // Very low creativity - precise reduction
        concise: {
            temperature: Math.max(Math.min(baseTemp * 0.2, maxTemp), 0.1),
            topK: Math.max(Math.min(baseTopK - 6, maxTopK), 1)
        },
        
        // Maximum creativity - wild and varied
        unhinged: {
            temperature: Math.min(baseTemp * 1.5, maxTemp),
            topK: Math.min(baseTopK + 5, maxTopK)
        }
    };
    
    return configs[tone] || {
        temperature: Math.min(baseTemp, maxTemp),
        topK: Math.min(baseTopK, maxTopK)
    };
}

function resetSessionTimeout(sessionKey) {
    // Clear existing timeout for this session
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
    }
    
    // Set new timeout to cleanup idle session using dynamic timeout from settings
    sessionTimeouts[sessionKey] = setTimeout(() => {
        cleanupIdleSession(sessionKey);
    }, getSessionIdleTime());
}

async function resetAISession(tone) {
    const sessionKey = tone || 'default';
    
    if (aiSessions[sessionKey]) {
        try {
            await aiSessions[sessionKey].destroy();
        } catch (error) {
            console.error(`Error destroying session ${sessionKey}:`, error);
        }
        delete aiSessions[sessionKey];
    }
    
    // Clear timeout
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
        delete sessionTimeouts[sessionKey];
    }
}

async function cleanupIdleSession(sessionKey) {
    if (aiSessions[sessionKey]) {
        try {
            console.log(`Cleaning up idle AI session: ${sessionKey}`);
            await aiSessions[sessionKey].destroy();
            delete aiSessions[sessionKey];
        } catch (error) {
            console.warn(`Error cleaning up idle session ${sessionKey}:`, error);
            delete aiSessions[sessionKey]; // Force cleanup even if destroy fails
        }
    }
    
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
        delete sessionTimeouts[sessionKey];
    }
}

function createPrompt(text, tone) {
    // Use consistent format matching the examples in getInitialPrompts
    const toneLabels = {
        polish: 'polished',
        engaging: 'engaging', 
        friendly: 'friendly',
        confident: 'confident',
        concise: 'concise',
        unhinged: 'unhinged'
    };
    
    const toneLabel = toneLabels[tone] || 'improved';
    return `Rewrite in a ${toneLabel} tone: '${text}'`;
}


function cleanResponse(response) {
    let cleaned = response.trim();
    
    // Remove surrounding quotes if present
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
    }
    
    // Remove any remaining "Output:" prefix that might appear
    cleaned = cleaned.replace(/^Output:\s*/i, '');
    
    // Remove arrow notation if present from legacy prompts
    cleaned = cleaned.replace(/^->\s*/, '');
    
    // Remove common AI preambles that might still appear
    cleaned = cleaned.replace(/^(Here (?:are|is)|Okay,?\s*)/i, '');
    
    // Clean up extra whitespace but preserve the full response
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Ensure we don't return empty text
    if (!cleaned || cleaned.length < 3) {
        console.warn('Response cleaning resulted in very short text, using original response');
        return response.trim();
    }
    
    return cleaned;
}

// Global instance for access from message handlers
let toneAdjusterInstance = null;

// Initialize the Tone Adjuster when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        toneAdjusterInstance = new ToneAdjuster();
    });
} else {
    toneAdjusterInstance = new ToneAdjuster();
}