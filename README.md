# Superior Browser MCP

> Browser automation via MCP for Chrome and Firefox with enhanced AI features

[![npm version](https://badge.fury.io/js/@superior/browser-mcp.svg)](https://www.npmjs.com/package/@superior/browser-mcp)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## What is this?

An enhanced MCP (Model Context Protocol) server that surpasses Blueprint MCP with advanced features for AI-powered browser automation. Uses your real browser profile with all your logged-in sessions, cookies, and extensions intact.

## Why Superior?

| Feature | Blueprint MCP | Superior Browser MCP |
|---------|---------------|----------------------|
| Visual Overlays | ❌ | ✅ Numbered element badges |
| Element Classification | Basic | ✅ Full AI categorization |
| Form Detection | Basic | ✅ Smart field matching |
| Ad Detection | ❌ | ✅ Auto-detect & block |
| Popup Handling | ❌ | ✅ Cookie, modal, notification |
| Self-Healing Selectors | ❌ | ✅ Fuzzy matching on failure |
| Storage Management | ❌ | ✅ localStorage & sessionStorage |
| Accessibility Tree | Basic | ✅ Full ARIA support |
| CAPTCHA Detection | ❌ | ✅ Report & alert |
| Login Form Detection | ❌ | ✅ Auto-detect credentials |
| Visual Diff | ❌ | ✅ Page state comparison |

## Installation

### 1. Install the MCP Server

```bash
npm install -g @superior/browser-mcp
```

### 2. Install the Browser Extension

**Chrome / Edge / Opera**
- Download from [Releases](https://github.com/superior-browser-mcp/releases)
- Load unpacked at `chrome://extensions/`

**Firefox**
- Download from [Releases](https://github.com/superior-browser-mcp/releases)
- Load at `about:debugging#/runtime/this-firefox`

### 3. Configure your MCP client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "superior-browser": {
      "command": "npx",
      "args": ["@superior/browser-mcp@latest"]
    }
  }
}
```

**Claude Code**:
```bash
claude mcp add browser npx @superior/browser-mcp@latest
```

## Quick Start

1. **Start your MCP client** (Claude Desktop, Cursor, etc)
2. **Click the Superior Browser MCP extension icon** in your browser
3. The extension auto-connects to the MCP server
4. **Ask your AI assistant to browse!**

## Available Tools

### Connection Management
- `enable` - Activate browser automation
- `disable` - Deactivate browser automation
- `status` - Check connection status

### Tab Management
- `browser_tabs` - List, create, attach, or close tabs

### Navigation
- `browser_navigate` - Navigate to URL, back, forward, reload

### Content & Inspection
- `browser_snapshot` - Get accessible page content
- `browser_take_screenshot` - Capture visual screenshot
- `browser_extract_content` - Extract page as markdown
- `browser_console_messages` - Get console logs
- `browser_network_requests` - Monitor network

### Interaction
- `browser_interact` - Click, type, hover, wait, scroll
- `browser_fill_form` - Fill multiple form fields
- `browser_press_key` - Press keyboard keys
- `browser_drag` - Drag and drop elements

### Advanced (Blueprint Features)
- `browser_evaluate` - Execute JavaScript
- `browser_handle_dialog` - Handle dialogs
- `browser_window` - Resize, minimize, maximize
- `browser_pdf_save` - Save page as PDF
- `browser_performance_metrics` - Get Web Vitals
- `browser_verify_text_visible` - Verify text
- `browser_verify_element_visible` - Verify element

---

## 🆕 NEW: Enhanced Features

### Visual Overlays
```javascript
// Get numbered overlays on all interactive elements
get_visual_map({ includeLabels: true })
// Returns: Screenshot with numbered badges + element map
```

### Interactive Element Map
```javascript
// Get clean JSON map of all interactive elements
get_interactive_map({ 
  filterType: 'button',  // or 'input', 'link', 'form', etc
  filterArea: 'header'    // or 'main', 'footer', 'sidebar'
})
```

### Smart Element Click
```javascript
// Click element by overlay number from visual map
click_by_overlay_id({ overlayId: 42 })
hover_by_overlay_id({ overlayId: 15 })
```

### Element Classification
```javascript
analyze_page({
  includeAds: true,      // Detect ad placements
  includePopups: true,   // Detect modals, cookie banners
  includeForms: true,    // Detailed form analysis
  includeNavigation: true,
  includeTables: true
})
```

### Smart Form Filling
```javascript
smart_fill_form({
  formData: {
    "email": "user@example.com",
    "password": "secret123",
    "name": "John Doe"
  },
  submitAfter: true      // Auto-submit after filling
})
```

### Form Analysis
```javascript
get_form_analysis({
  includeSuggestions: true  // Get suggested test values
})
```

### Cookie & Storage Management
```javascript
manage_cookies({ action: 'get' })
manage_cookies({ action: 'set', cookies: [{ name: 'token', value: 'abc123' }] })
manage_cookies({ action: 'delete', name: 'token' })

manage_storage({ action: 'get', type: 'local' })
manage_storage({ action: 'set', type: 'session', key: 'preferences', value: JSON.stringify({ theme: 'dark' }) })
```

### Popup & Ad Detection
```javascript
detect_popups({ 
  autoClose: true,  // Auto-accept cookies
  types: ['cookie_banner', 'modal', 'notification']
})

detect_ads({ 
  includePositions: true,
  blockAds: true    // Hide detected ads
})
```

### Smart Waiting
```javascript
wait_for({
  selector: '#dynamic-content',
  visible: true,
  timeout: 10000
})

wait_for({
  text: 'Success message',
  timeout: 5000
})

wait_for({
  condition: 'document.querySelector(".loaded") !== null'
})
```

### Self-Healing Selectors
```javascript
self_heal_selector({
  failedSelector: '#submit-button',
  textHint: 'Submit',    // Fuzzy match on text
  roleHint: 'button'     // Match by role
})
// Returns: Suggestions for alternative selectors
```

### Accessibility Tree
```javascript
get_accessibility_tree({
  maxDepth: 10,
  filterRole: 'button'   // Filter by ARIA role
})
```

### CAPTCHA Detection
```javascript
detect_captcha()
// Returns: { captchaDetected: true/false, type: 'reCAPTCHA', etc }
```

### Login Form Detection
```javascript
detect_login_form()
// Returns: { loginFormsDetected: true, forms: [...] }
```

### Smart Scrolling
```javascript
scroll_page({ action: 'lazy_load' })  // Load all lazy content
scroll_page({ action: 'element', selector: '#footer' })
scroll_page({ action: 'bottom' })
```

## How it works

```
┌─────────────────────────┐
│   AI Assistant          │
│   (Claude, GPT, etc)    │
└───────────┬─────────────┘
            │
            │ MCP Protocol
            ↓
┌─────────────────────────┐
│   MCP Client            │
│   (Claude Desktop, etc) │
└───────────┬─────────────┘
            │ stdio/JSON-RPC
            ↓
┌─────────────────────────┐
│   superior-browser-mcp │
│   (this package)       │
└───────────┬─────────────┘
            │ WebSocket (localhost:5555)
            ↓
┌─────────────────────────┐
│   Browser Extension     │
└───────────┬─────────────┘
            │
            │ Chrome/Firefox APIs
            ↓
┌─────────────────────────┐
│   Your Browser          │
│   (real profile)        │
└─────────────────────────┘
```

## Development

```bash
# Clone the repository
git clone https://github.com/superior-browser-mcp/superior-browser-mcp.git
cd superior-browser-mcp

# Install dependencies
npm install

# Run in development
npm run dev

# Build Chrome extension
npm run build:chrome
```

### Project Structure

```
superior-browser-mcp/
├── server/                     # MCP Server
│   ├── cli.js                  # Server entry point
│   └── src/
│       ├── statefulBackend.js  # All tool implementations
│       ├── extensionServer.js  # WebSocket server
│       └── unifiedBackend.js   # Tool dispatcher
├── extensions/                 # Browser Extensions
│   ├── chrome/                 # Chrome extension (MV3)
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   └── src/
│   │       ├── background.js
│   │       ├── content-script.js
│   │       └── popup.js
│   └── firefox/                # Firefox extension (MV2)
├── docs/                       # Documentation
└── package.json
```

## Configuration

### Environment Variables

```bash
# Local WebSocket port (default: 5555)
MCP_PORT=5555

# Debug mode
DEBUG=true
```

### Command Line Options

```bash
superior-browser-mcp --debug              # Enable verbose logging
superior-browser-mcp --port 8080          # Use custom port
```

## Security

- MCP server only accepts local connections by default (localhost:5555)
- Extension requires explicit user action to connect
- All browser actions go through the browser's permission system

## License

Apache License 2.0

Copyright (c) 2025 Superior Browser MCP