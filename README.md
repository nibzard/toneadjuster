# The Tone Adjuster 🎨

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](https://github.com/nibzard/toneadjuster/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-138%2B-orange?style=for-the-badge)](https://www.google.com/chrome/)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple?style=for-the-badge&logo=shield&logoColor=white)](https://github.com/nibzard/toneadjuster#-privacy--security)

> Transform your writing tone instantly with on-device AI - no data ever leaves your browser! 🔒

## 🌟 Overview

The Tone Adjuster is a privacy-focused Chrome extension that leverages Chrome's built-in AI capabilities to help you adjust the tone of your text directly within your browser. Whether you need to make an email more formal, a message friendlier, or a response more concise, this extension has you covered - all while keeping your data completely private.

### ✨ Key Features

- **🔐 100% Private**: All AI processing happens locally using Chrome's Gemini Nano model
- **⚡ Lightning Fast**: On-device processing means instant results
- **🎯 6 Tone Options**: From professional to playful, find the perfect voice
- **👆 Easy to Use**: Just select, right-click, and choose your tone
- **🌐 Works Everywhere**: Compatible with any text field on any website
- **🚫 No External APIs**: Zero network requests, zero data collection

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Tone Selection Menu
Select your text and choose from 6 different tones:

![Tone Selection](https://via.placeholder.com/600x400/4285F4/FFFFFF?text=Tone+Selection+Menu)

### Live Preview
See your adjusted text before applying:

![Preview](https://via.placeholder.com/600x400/34A853/FFFFFF?text=Live+Preview)

### Extension Popup
Quick access to all features:

![Popup](https://via.placeholder.com/600x400/EA4335/FFFFFF?text=Extension+Popup)

</details>

## 🎨 Available Tones

| Tone | Icon | Description | Perfect For |
|------|------|-------------|-------------|
| **Polish** | 💎 | Fix grammar, spelling, and improve clarity | Proofreading and refinement |
| **Formal** | 📋 | Professional and business-appropriate | Work emails, reports, documentation |
| **Friendly** | 😊 | Warm and approachable | Personal messages, casual communication |
| **Confident** | 💪 | Assertive and decisive | Proposals, negotiations, leadership |
| **Concise** | ⚡ | Brief and to the point | Summaries, quick updates, tweets |
| **Unhinged** | 🤪 | Creative and entertaining | Social media, creative writing, fun |

## 🚀 Installation

### Option 1: Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store soon!

### Option 2: Manual Installation (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone https://github.com/nibzard/toneadjuster.git
   cd toneadjuster
   ```

2. **Enable Chrome AI**
   - Navigate to `chrome://flags`
   - Search for "Prompt API" or "AI"
   - Enable relevant flags
   - Restart Chrome

3. **Install the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `toneadjuster` folder
   - The extension icon will appear in your toolbar!

## 📋 Requirements

- **Chrome Version**: 138 or higher
- **Operating System**: Windows, macOS, or Linux
- **Chrome AI**: Must have Chrome AI features enabled
- **Storage**: ~50MB for the on-device AI model

## 🎯 How to Use

### Method 1: Right-Click Context Menu
1. Select any text in an editable field
2. Right-click to open the context menu
3. Choose "Adjust Tone" and select your desired tone
4. Review the preview and click "Accept" or "Try Again"

### Method 2: Floating Tooltip
1. Select text in any input field
2. A tooltip will appear automatically
3. Click on your desired tone
4. Approve or reject the adjusted text

### Method 3: Keyboard Shortcut (Coming Soon)
- Select text and press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

## 🔒 Privacy & Security

Your privacy is our top priority. Here's how we protect it:

### Data Protection
- ✅ **No External Servers**: All processing happens on your device
- ✅ **No Data Collection**: We don't track, store, or transmit your text
- ✅ **No Analytics**: Zero tracking or telemetry
- ✅ **No Account Required**: Use immediately without sign-up
- ✅ **Open Source**: Inspect our code anytime

### Security Features
- 🛡️ Secure DOM manipulation (no innerHTML with user content)
- 🛡️ Comprehensive input validation and sanitization
- 🛡️ Automatic session cleanup after 5 minutes of inactivity
- 🛡️ Minimal permissions required
- 🛡️ Regular security updates

## 🛠️ Development

### Prerequisites
- Node.js 18+ (for development tools)
- Chrome 138+ with AI features enabled
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/nibzard/toneadjuster.git
cd toneadjuster

# No build step required - vanilla JavaScript!
# Load the extension in Chrome as described above
```

### Project Structure
```
toneadjuster/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for AI processing
├── content.js          # Content script for UI interaction
├── popup.html/js       # Extension popup interface
├── styles.css          # Styling for UI components
├── icons/              # Extension icons
└── docs/               # Documentation
```

### Testing
Run the test suite:
```bash
# Manual testing checklist
cat TEST_CASES.md

# Follow the test cases to ensure everything works
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the Repository**
2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and development process.

## 📝 Roadmap

### Version 1.1 (Q1 2025)
- [ ] Custom tone creation
- [ ] Keyboard shortcuts
- [ ] History of adjustments
- [ ] Bulk text processing

### Version 1.2 (Q2 2025)
- [ ] Additional languages support
- [ ] Integration with popular web apps
- [ ] Advanced formatting preservation
- [ ] Tone strength slider

### Future Features
- [ ] Team collaboration features
- [ ] API for developers
- [ ] Mobile companion app
- [ ] Voice input support

## 🐛 Known Issues

- Extension requires Chrome 138+ with AI features enabled
- Some websites with strict CSP may block the tooltip
- Large text selections (>5000 chars) are truncated
- See [Issues](https://github.com/nibzard/toneadjuster/issues) for more

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 The Tone Adjuster

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- Chrome AI team for the Gemini Nano model
- [Chrome Extensions documentation](https://developer.chrome.com/docs/extensions/)
- All our contributors and users
- Icon designs by [Icons8](https://icons8.com)

## 💬 Support

Need help? Have questions?

- 📧 **Email**: support@toneadjuster.example.com
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nibzard/toneadjuster/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/nibzard/toneadjuster/issues)
- 📖 **Documentation**: [Wiki](https://github.com/nibzard/toneadjuster/wiki)

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nibzard/toneadjuster&type=Date)](https://star-history.com/#nibzard/toneadjuster&Date)

---

<div align="center">

**[Website](https://toneadjuster.example.com)** • **[Documentation](https://github.com/nibzard/toneadjuster/wiki)** • **[Report Bug](https://github.com/nibzard/toneadjuster/issues)** • **[Request Feature](https://github.com/nibzard/toneadjuster/issues)**

Made with ❤️ by [nibzard](https://github.com/nibzard) and [contributors](https://github.com/nibzard/toneadjuster/graphs/contributors)

If you find this project useful, please consider giving it a ⭐!

</div>