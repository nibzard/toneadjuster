# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"The Tone Adjuster" is a Chrome browser extension that uses Chrome's built-in AI Prompt API to help users adjust the tone of their written text directly within the browser. This is a privacy-focused tool that performs all AI processing on-device without sending user data to external servers.

## Core Architecture

This is currently a specification-only repository. The project will be a Chrome extension (Manifest V3) that leverages:

- **Chrome AI Prompt API**: Uses `chrome.ai` for on-device text rewriting
- **Context Menu Integration**: Right-click menu for text adjustment
- **On-device Processing**: All AI operations happen locally using Chrome's "nano" model

## Key Technical Requirements

### Manifest Configuration
- Requires `"ai"` permission in manifest.json
- Must use Manifest V3 format
- Target audience: Chrome users on macOS initially

### API Usage Patterns
- Always check `chrome.ai` availability before using
- Create sessions with `chrome.ai.createSession()`
- Use simple, direct prompts (complex reasoning not supported by nano model)
- Handle session management efficiently (browser terminates unused sessions)

### Core Functionality
- Text selection detection in editable fields
- Tone options: Formal, Friendly, Confident, Concise, Empathetic
- Real-time text rewriting with user approval workflow
- Error handling for API unavailability and processing failures

## Development Notes

- No build system or package manager currently configured
- Project is in specification phase - implementation needed
- Focus on lightweight, privacy-preserving design
- UI should be minimalistic and non-intrusive
- Target fast response times due to on-device processing

## Reference Documentation

Key Chrome documentation:
- Extensions AI Prompt API: https://developer.chrome.com/docs/extensions/ai/prompt-api
- General Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- WebML Prompt API: https://github.com/webmachinelearning/prompt-api