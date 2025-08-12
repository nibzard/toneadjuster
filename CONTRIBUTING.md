# Contributing to The Tone Adjuster

First off, thank you for considering contributing to The Tone Adjuster! It's people like you that make this extension a great tool for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Show empathy towards other community members

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/toneadjuster.git`
3. Add upstream remote: `git remote add upstream https://github.com/nibzard/toneadjuster.git`
4. Create a branch: `git checkout -b feature/your-feature-name`

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Chrome version and OS information
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and examples
- Possible implementation approach

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Help improve our docs

## 🛠️ Development Setup

### Prerequisites

- Chrome 138+ with AI features enabled
- Git
- Basic knowledge of JavaScript and Chrome Extensions

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/nibzard/toneadjuster.git
   cd toneadjuster
   ```

2. **Load the extension in Chrome**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project directory

3. **Make your changes**
   - Edit the relevant files
   - Test your changes thoroughly
   - Run through the test cases in `TEST_CASES.md`

## 📝 Style Guidelines

### JavaScript Style

- Use ES6+ features where appropriate
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Use async/await over promises when possible

Example:
```javascript
// Good
async function adjustTextTone(text, tone) {
    // Validate input
    if (!text || !tone) {
        throw new Error('Text and tone are required');
    }
    
    // Process text
    const result = await processWithAI(text, tone);
    return result;
}

// Avoid
function adjust(t, tn) {
    return processWithAI(t, tn).then(r => r);
}
```

### HTML/CSS Style

- Use semantic HTML5 elements
- Keep CSS modular and reusable
- Use CSS variables for theming
- Ensure accessibility (ARIA labels, keyboard navigation)

## 💬 Commit Messages

We follow the Conventional Commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add Polish tone option for grammar correction
fix: resolve tooltip positioning on scrollable pages
docs: update README with installation instructions
```

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Add/update code comments
   - Update TEST_CASES.md if adding features

2. **Test Your Changes**
   - Run through relevant test cases
   - Test on different websites
   - Check Chrome DevTools console for errors

3. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes

4. **Code Review**
   - Address reviewer feedback
   - Make requested changes
   - Keep discussions constructive

5. **Merge**
   - PRs are merged once approved by maintainers
   - We use squash merging to keep history clean

## 🧪 Testing

Before submitting a PR, ensure:

- [ ] Extension loads without errors
- [ ] All tone options work correctly
- [ ] Text selection and replacement works
- [ ] No console errors in Chrome DevTools
- [ ] UI displays correctly on different screen sizes
- [ ] Privacy: No external network requests

## 📚 Additional Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome AI API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [Project Wiki](https://github.com/nibzard/toneadjuster/wiki)
- [Issue Tracker](https://github.com/nibzard/toneadjuster/issues)

## ❓ Questions?

Feel free to:
- Open a [Discussion](https://github.com/nibzard/toneadjuster/discussions)
- Ask in an [Issue](https://github.com/nibzard/toneadjuster/issues)
- Contact the maintainers

Thank you for contributing! 🎉