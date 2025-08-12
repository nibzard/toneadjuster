Of course. Here is the updated functional specification for "The Tone Adjuster," now including the relevant implementation details and links from the Google Chrome developer documentation.

### **Functional Specification: The Tone Adjuster (v1.1)**

**1. Vision and Goal**

To create a browser extension that empowers users to communicate more effectively and confidently by providing on-demand, AI-powered adjustments to the tone of their written text directly within the browser.

The primary goal is to offer a seamless and privacy-preserving tool that helps users adapt their writing style for various audiences and contexts, from professional emails to casual social media posts, by leveraging Chrome's built-in AI capabilities.

**2. Target Audience**

The initial target audience will be new MacBook owners who are users of the Google Chrome browser. This group is typically tech-savvy, open to adopting new productivity tools, and values the performance and privacy benefits of on-device processing.

As the underlying technology becomes more widely available, the target audience will expand to include a broader range of Chrome users across different operating systems.

**3. Core Functionality**

The core feature of "The Tone Adjuster" is to rewrite a selected portion of text in a different tone using the on-device AI capabilities of the Chrome Prompt API.

**3.1. Invoking the Tool**

Users will be able to activate "The Tone Adjuster" in two ways:

*   **Context Menu:** After highlighting a piece of text in any editable field within the browser (e.g., a textarea in Gmail, a post on a social media site, a comment field on a blog), the user can right-click to open the context menu. A new option, "Adjust Tone," will be available.
*   **Keyboard Shortcut:** A customizable keyboard shortcut will allow users to quickly bring up the tone adjustment options for their selected text.

**3.2. Tone Selection**

Upon invoking the tool, a user-friendly interface will appear, offering a selection of predefined tones. The initial set of tones will include:

*   **Polish:** (Default) For correcting grammar, fixing errors, and improving overall clarity and fluency.
*   **Formal:** For professional correspondence, reports, and official documents.
*   **Friendly:** To make communication more approachable and personable.
*   **Confident:** For assertive and persuasive writing.
*   **Concise:** To shorten the text while retaining the core message.
*   **Unhinged:** For generating humorous, chaotic, or surprising text for creative or entertainment purposes.

**3.3. Presenting the Adjusted Text**

Once a tone is selected, the extension will send a prompt to the on-device AI model to rewrite the text. The rewritten text will then be presented to the user in a clear and non-intrusive manner.

The interface will display the suggested alternative text, allowing the user to easily compare it with their original writing. The user will have the following options:

*   **Replace:** One-click replacement of the original text with the AI-generated suggestion.
*   **Copy:** Copy the suggested text to the clipboard.
*   **Try Another Tone:** Easily switch to a different tone to see alternative suggestions.
*   **Dismiss:** Close the suggestion interface without making any changes.

**4. Implementation Details and API Usage**

Implementation will strictly follow the guidelines provided in the Chrome for Developers documentation.

*   **Relevant Documentation:**
    *   **Extensions AI Prompt API:** [https://developer.chrome.com/docs/extensions/ai/prompt-api](https://developer.chrome.com/docs/extensions/ai/prompt-api)
    *   **General Prompt API Overview:** [https://developer.chrome.com/docs/ai/prompt-api](https://developer.chrome.com/docs/ai/prompt-api)

**4.1. Manifest and Permissions**

The extension's `manifest.json` file must include the `"ai"` permission to use the API.

```json
{
  "name": "The Tone Adjuster",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "ai"
  ],
  ...
}
```

**4.2. API Availability Check**

Before attempting to use the API, the extension must verify that it is available and enabled by the user. This will be done by checking for the existence of the `chrome.ai` namespace.

*   **Reference:** [Check for availability](https://developer.chrome.com/docs/extensions/ai/prompt-api#check-for-availability)

```javascript
if (chrome.ai) {
  // API is available, proceed with enabling functionality.
} else {
  // API not available. The UI should reflect this,
  // perhaps by disabling the context menu item.
}
```

**4.3. Creating an AI Session**

To interact with the model, the extension will create a `chrome.ai.Session`. This session object will be used for all subsequent interactions with the AI.

*   **Reference:** [Create a session](https://developer.chrome.com/docs/extensions/ai/prompt-api#create-a-session)

```javascript
const session = await chrome.ai.createSession();
```

**4.4. Prompt Execution**

When a user selects a tone, a carefully crafted prompt will be sent to the AI model via the `session.prompt()` method. The prompt will include the selected text and the desired tone.

*   **Example Prompt:** `Rewrite the following text in a more formal tone: "[user's selected text]"`
*   **Reference:** [Execute a prompt](https://developer.chrome.com/docs/extensions/ai/prompt-api#execute-a-prompt)

```javascript
const tone = "formal"; // Example tone
const selectedText = "I need this done asap."; // Example user text
const prompt = `Rewrite the following text in a ${tone} tone: "${selectedText}"`;

const response = await session.prompt(prompt);
// The 'response' variable will contain the AI-generated text.
```

**4.5. Model and Limitations**

The implementation must account for the nature of the "nano" on-device model.

*   **Simplicity:** Prompts must be direct and simple. Complex, multi-step reasoning is not supported.
*   **Factual Accuracy:** The model is not designed for factual recall. The extension's purpose is creative rewriting, not information retrieval, which aligns well with this limitation.
*   **Resource Management:** The `chrome.ai.Session` should be managed efficiently. The documentation suggests that sessions that are not in use will be terminated by the browser. Our implementation will create a session on-demand when the user invokes the tool.

**5. User Interface and User Experience (UI/UX)**

The UI will be designed to be clean, intuitive, and seamlessly integrated into the user's browsing experience.

*   **Pop-up/Overlay:** When activated, a small, unobtrusive pop-up or overlay will appear near the selected text. This will prevent the user from losing context.
*   **Minimalistic Design:** The design will be modern and minimalistic, aligning with the aesthetics of macOS and Chrome.
*   **Responsiveness:** The interface will be fast and responsive, providing near-instantaneous suggestions due to the on-device nature of the AI.

**6. Non-Functional Requirements**

**6.1. Privacy**

User privacy is a cornerstone of this product, and the use of the Prompt API reinforces this.

*   **On-Device Processing:** All AI processing is handled directly on the user's machine by Chrome's built-in model. No user-written text will ever be sent to an external server by our extension.
*   **No Data Collection:** The extension will not collect or store any user-generated content.
*   **Documentation Reference:** The API's privacy-preserving design is a key feature highlighted in the [Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api).

**6.2. Performance**

The extension must be lightweight and have a minimal impact on browser performance.

*   **Low Resource Usage:** The extension will be optimized to use minimal CPU and memory resources.
*   **Fast Execution:** Tone adjustment suggestions should be generated and displayed with very low latency.

**6.3. Compatibility**

The extension will be compatible with the latest stable version of Google Chrome on macOS where the Prompt API is available. As the API rolls out to other operating systems, compatibility will be expanded.

**7. Edge Cases and Error Handling**

*   **No Text Selected:** If the user attempts to invoke the extension without selecting any text, a tooltip or a subtle notification will prompt them to select text first.
*   **Short Text:** For very short or ambiguous text selections, the AI may not be able to provide a meaningful adjustment. In such cases, the extension will display a message like, "Please select more text for a better suggestion."
*   **API Not Available/Disabled:** If `chrome.ai` is not present, the "Adjust Tone" context menu item will be disabled. The extension could also offer a page explaining that the feature requires a specific Chrome version and for the user to enable the "On-Device AI" setting.
*   **Error during Prompt Execution:** Any errors thrown by `session.prompt()` will be caught, and a user-friendly error message will be displayed (e.g., "Sorry, the AI is unable to process this request right now.").

**8. Future Enhancements**

*   **Custom Tones:** Allowing users to define their own custom tones based on their writing style.
*   **Multi-Language Support:** Expanding the tone adjustment capabilities to other languages as the on-device AI models evolve.
*   **Streaming Responses:** For longer text, investigate using `session.promptStreaming()` to display the adjusted text as it's being generated, improving perceived performance.
    *   **Reference:** [Stream responses](https://developer.chrome.com/docs/extensions/ai/prompt-api#stream-responses)
    * GITHUB: https://github.com/webmachinelearning/prompt-api