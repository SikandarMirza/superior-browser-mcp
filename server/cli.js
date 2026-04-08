#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema, ToolSchema } = require('@modelcontextprotocol/sdk/types.js');
const { StatefulBackend } = require('./src/statefulBackend.js');

const backend = new StatefulBackend();

const server = new Server(
  {
    name: 'superior-browser-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'enable',
        description: 'Activate browser automation. Required first step before any browser interaction.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Human-readable identifier for this MCP client (e.g., "my-project", "task-automation")'
            },
            force_free: {
              type: 'boolean',
              description: 'Force free mode (local standalone) even if PRO tokens are present'
            }
          },
          required: ['client_id']
        }
      },
      {
        name: 'disable',
        description: 'Deactivate browser automation and disconnect from browser extension',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'status',
        description: 'Check current connection status and browser state',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'browser_tabs',
        description: 'Manage browser tabs: list, create, attach, or close tabs',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'new', 'attach', 'close'], description: 'Action to perform' },
            url: { type: 'string', description: 'URL to navigate to (for new action)' },
            index: { type: 'number', description: 'Tab index (for attach/close)' },
            activate: { type: 'boolean', description: 'Bring tab to foreground' },
            stealth: { type: 'boolean', description: 'Enable stealth mode' }
          },
          required: ['action']
        }
      },
      {
        name: 'browser_navigate',
        description: 'Navigate to URL, back, forward, or reload page',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['url', 'back', 'forward', 'reload'], description: 'Navigation action' },
            url: { type: 'string', description: 'URL to navigate to (required for url action)' }
          },
          required: ['action']
        }
      },
      {
        name: 'browser_snapshot',
        description: 'Get accessible DOM snapshot of the page (fast, text-based)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'browser_take_screenshot',
        description: 'Capture screenshot with optional overlays, element highlighting, or partial capture',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['png', 'jpeg'], description: 'Image format' },
            fullPage: { type: 'boolean', description: 'Capture full page' },
            quality: { type: 'number', description: 'JPEG quality 0-100' },
            path: { type: 'string', description: 'File path to save' },
            highlightClickables: { type: 'boolean', description: 'Highlight clickable elements' },
            showOverlays: { type: 'boolean', description: 'Show numbered overlays on interactive elements' },
            deviceScale: { type: 'number', description: 'Output scale factor' },
            selector: { type: 'string', description: 'CSS selector for partial screenshot' },
            padding: { type: 'number', description: 'Padding around selector' }
          }
        }
      },
      {
        name: 'browser_extract_content',
        description: 'Extract page content as clean markdown with smart content detection',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['auto', 'full', 'selector'], description: 'Extraction mode' },
            selector: { type: 'string', description: 'CSS selector (for selector mode)' },
            max_lines: { type: 'number', description: 'Maximum lines to extract' },
            offset: { type: 'number', description: 'Line offset for pagination' }
          }
        }
      },
      {
        name: 'browser_interact',
        description: 'Perform one or more interactions: click, type, hover, scroll, drag, wait, file upload, and more',
        inputSchema: {
          type: 'object',
          properties: {
            actions: {
              type: 'array',
              description: 'Array of actions to perform in sequence',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['click', 'type', 'clear', 'press_key', 'hover', 'wait', 'mouse_move', 'mouse_click', 'scroll_to', 'scroll_by', 'scroll_into_view', 'select_option', 'file_upload', 'force_pseudo_state'] },
                  selector: { type: 'string', description: 'CSS selector' },
                  text: { type: 'string', description: 'Text to type' },
                  key: { type: 'string', description: 'Key to press' },
                  value: { type: 'string', description: 'Option to select' },
                  pseudoStates: { type: 'array', items: { type: 'string' } },
                  files: { type: 'array', items: { type: 'string' } },
                  x: { type: 'number' },
                  y: { type: 'number' },
                  button: { type: 'string', enum: ['left', 'right', 'middle'] },
                  clickCount: { type: 'number' },
                  timeout: { type: 'number' }
                },
                required: ['type']
              }
            },
            onError: { type: 'string', enum: ['stop', 'ignore'] }
          },
          required: ['actions']
        }
      },
      {
        name: 'browser_fill_form',
        description: 'Fill multiple form fields at once with smart field matching',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  selector: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          },
          required: ['fields']
        }
      },
      {
        name: 'browser_evaluate',
        description: 'Execute JavaScript in page context',
        inputSchema: {
          type: 'object',
          properties: {
            function: { type: 'string', description: 'JavaScript function to execute' },
            expression: { type: 'string', description: 'JavaScript expression to evaluate' }
          }
        }
      },
      {
        name: 'browser_console_messages',
        description: 'Get browser console messages with filtering',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['log', 'warn', 'error', 'info', 'debug'] },
            text: { type: 'string', description: 'Filter by text' },
            url: { type: 'string', description: 'Filter by URL' },
            limit: { type: 'number', description: 'Max messages' },
            offset: { type: 'number', description: 'Skip messages' }
          }
        }
      },
      {
        name: 'browser_network_requests',
        description: 'Monitor and replay network requests with JSONPath filtering',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'details', 'replay', 'clear'] },
            urlPattern: { type: 'string' },
            method: { type: 'string' },
            status: { type: 'number' },
            resourceType: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            requestId: { type: 'string' },
            jsonPath: { type: 'string' }
          },
          required: ['action']
        }
      },
      {
        name: 'browser_window',
        description: 'Manage browser window: resize, minimize, maximize, close',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['resize', 'close', 'minimize', 'maximize'] },
            width: { type: 'number' },
            height: { type: 'number' }
          },
          required: ['action']
        }
      },
      {
        name: 'browser_pdf_save',
        description: 'Save current page as PDF',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to save PDF' }
          }
        }
      },
      {
        name: 'browser_handle_dialog',
        description: 'Handle alert/confirm/prompt dialogs',
        inputSchema: {
          type: 'object',
          properties: {
            accept: { type: 'boolean' },
            text: { type: 'string', description: 'Text for prompt' }
          },
          required: ['accept']
        }
      },
      {
        name: 'browser_performance_metrics',
        description: 'Get Web Vitals and performance metrics',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'browser_verify_text_visible',
        description: 'Verify text is visible on page (for testing)',
        inputSchema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text']
        }
      },
      {
        name: 'browser_verify_element_visible',
        description: 'Verify element is visible on page (for testing)',
        inputSchema: {
          type: 'object',
          properties: { selector: { type: 'string' } },
          required: ['selector']
        }
      },
      {
        name: 'browser_list_extensions',
        description: 'List installed browser extensions',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'browser_reload_extensions',
        description: 'Reload unpacked/development browser extensions',
        inputSchema: {
          type: 'object',
          properties: { extensionName: { type: 'string' } }
        }
      },
      {
        name: 'get_visual_map',
        description: '🆕 Get visual map of interactive elements with numbered overlays. Shows a screenshot where every clickable element has a number badge. Use "click(42)" style references.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['png', 'jpeg'], description: 'Image format' },
            quality: { type: 'number', description: 'JPEG quality 0-100' },
            path: { type: 'string', description: 'File path to save' },
            fullPage: { type: 'boolean', description: 'Capture full page' },
            includeLabels: { type: 'boolean', description: 'Include text labels with numbers' },
            elementTypes: { type: 'array', items: { type: 'string' }, description: 'Filter by element types (button, input, link, etc)' }
          }
        }
      },
      {
        name: 'get_interactive_map',
        description: '🆕 Get a clean JSON map of ALL interactive elements with IDs, types, labels, and positions. Perfect for AI understanding of page layout.',
        inputSchema: {
          type: 'object',
          properties: {
            includeHidden: { type: 'boolean', description: 'Include hidden elements' },
            filterType: { type: 'string', description: 'Filter by element type (button, input, link, form, table, etc)' },
            filterArea: { type: 'string', description: 'Filter by page area (header, main, footer, sidebar, all)' },
            maxElements: { type: 'number', description: 'Maximum elements to return' }
          }
        }
      },
      {
        name: 'get_element_details',
        description: '🆕 Get detailed information about specific elements including computed styles, accessibility info, and state',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            overlayId: { type: 'number', description: 'Overlay ID from visual map' },
            includeStyles: { type: 'boolean', description: 'Include computed CSS styles' },
            includeAccessibility: { type: 'boolean', description: 'Include ARIA and accessibility info' }
          }
        }
      },
      {
        name: 'analyze_page',
        description: '🆕 Auto-detect and classify page components: forms, navigation, ads, popups, modals, cookie banners, tables, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            includeAds: { type: 'boolean', description: 'Detect and report ad placements' },
            includePopups: { type: 'boolean', description: 'Detect popups, modals, cookie banners' },
            includeForms: { type: 'boolean', description: 'Detailed form analysis' },
            includeNavigation: { type: 'boolean', description: 'Detect navigation elements' },
            includeTables: { type: 'boolean', description: 'Detect and describe tables' }
          }
        }
      },
      {
        name: 'smart_fill_form',
        description: '🆕 Auto-detect form fields and fill them intelligently based on field labels, names, and types',
        inputSchema: {
          type: 'object',
          properties: {
            formData: {
              type: 'object',
              description: 'Key-value pairs where keys are field labels/names and values are the data to fill',
              additionalProperties: true
            },
            formSelector: { type: 'string', description: 'Specific form to target (auto-detects if not provided)' },
            submitAfter: { type: 'boolean', description: 'Automatically submit form after filling' }
          },
          required: ['formData']
        }
      },
      {
        name: 'get_form_analysis',
        description: '🆕 Get detailed analysis of all forms on page including field types, labels, required status, and validation rules',
        inputSchema: {
          type: 'object',
          properties: {
            formSelector: { type: 'string', description: 'Specific form to analyze (analyzes all if not provided)' },
            includeSuggestions: { type: 'boolean', description: 'Include suggested test data for each field' }
          }
        }
      },
      {
        name: 'click_by_overlay_id',
        description: '🆕 Click an element by its overlay ID from the visual map',
        inputSchema: {
          type: 'object',
          properties: {
            overlayId: { type: 'number', description: 'The number shown on the visual overlay' }
          },
          required: ['overlayId']
        }
      },
      {
        name: 'hover_by_overlay_id',
        description: '🆕 Hover over an element by its overlay ID from the visual map',
        inputSchema: {
          type: 'object',
          properties: {
            overlayId: { type: 'number', description: 'The number shown on the visual overlay' }
          },
          required: ['overlayId']
        }
      },
      {
        name: 'detect_popups',
        description: '🆕 Detect and handle popups, modals, cookie banners, and notifications',
        inputSchema: {
          type: 'object',
          properties: {
            autoClose: { type: 'boolean', description: 'Automatically try to close detected popups' },
            types: { type: 'array', items: { type: 'string', enum: ['cookie_banner', 'modal', 'popup', 'notification', 'overlay', 'consent'] }, description: 'Types of popups to detect' }
          }
        }
      },
      {
        name: 'detect_ads',
        description: '🆕 Detect ad elements on the page with detailed information',
        inputSchema: {
          type: 'object',
          properties: {
            includePositions: { type: 'boolean', description: 'Include ad positions and sizes' },
            blockAds: { type: 'boolean', description: 'Block detected ads (injects blocker)' }
          }
        }
      },
      {
        name: 'manage_cookies',
        description: '🆕 Get, set, or delete browser cookies',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['get', 'set', 'delete', 'clear'], description: 'Cookie action' },
            cookies: { type: 'array', items: { type: 'object' }, description: 'Cookie objects for set action' },
            domain: { type: 'string', description: 'Filter by domain' },
            name: { type: 'string', description: 'Cookie name' }
          },
          required: ['action']
        }
      },
      {
        name: 'manage_storage',
        description: '🆕 Access and modify localStorage and sessionStorage',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['get', 'set', 'delete', 'clear'], description: 'Storage action' },
            type: { type: 'string', enum: ['local', 'session'], description: 'Storage type' },
            key: { type: 'string', description: 'Storage key' },
            value: { type: 'string', description: 'Value to set' }
          },
          required: ['action', 'type']
        }
      },
      {
        name: 'wait_for',
        description: '🆕 Smart wait for elements, text, or conditions with retry',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector to wait for' },
            text: { type: 'string', description: 'Text to wait for' },
            condition: { type: 'string', description: 'JavaScript condition to wait for' },
            timeout: { type: 'number', description: 'Maximum wait time in ms' },
            visible: { type: 'boolean', description: 'Wait for element to be visible' }
          }
        }
      },
      {
        name: 'self_heal_selector',
        description: '🆕 Find the best matching element when a selector fails, using fuzzy matching on text, role, and attributes',
        inputSchema: {
          type: 'object',
          properties: {
            failedSelector: { type: 'string', description: 'The selector that failed' },
            textHint: { type: 'string', description: 'Text content hint for fuzzy matching' },
            roleHint: { type: 'string', description: 'Expected role (button, link, input, etc)' }
          },
          required: ['failedSelector']
        }
      },
      {
        name: 'get_accessibility_tree',
        description: '🆕 Get the full accessibility tree with ARIA roles, names, and states (screen reader view)',
        inputSchema: {
          type: 'object',
          properties: {
            maxDepth: { type: 'number', description: 'Maximum tree depth' },
            includeHidden: { type: 'boolean', description: 'Include hidden elements' },
            filterRole: { type: 'string', description: 'Filter by ARIA role' }
          }
        }
      },
      {
        name: 'detect_captcha',
        description: '🆕 Detect if a CAPTCHA or bot verification is present on the page',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'detect_login_form',
        description: '🆕 Auto-detect login forms and provide structured information about username/password fields',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'scroll_page',
        description: '🆕 Smart scroll with lazy loading support, can scroll to specific elements or areas',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['top', 'bottom', 'element', 'coordinates', 'lazy_load'], description: 'Scroll action' },
            selector: { type: 'string', description: 'Element to scroll to' },
            x: { type: 'number' },
            y: { type: 'number' },
            loadAll: { type: 'boolean', description: 'Keep scrolling until all lazy content loads' }
          },
          required: ['action']
        }
      },
      {
        name: 'compare_pages',
        description: '🆕 Visual diff between current page state and a previous screenshot or URL',
        inputSchema: {
          type: 'object',
          properties: {
            previousPath: { type: 'string', description: 'Path to previous screenshot' },
            previousUrl: { type: 'string', description: 'URL to compare against' },
            outputPath: { type: 'string', description: 'Path to save diff image' },
            highlightChanges: { type: 'boolean', description: 'Highlight changed areas' }
          }
        }
      },
      {
        name: 'browser_drag',
        description: 'Drag element to another element',
        inputSchema: {
          type: 'object',
          properties: {
            fromSelector: { type: 'string', description: 'Source element selector' },
            toSelector: { type: 'string', description: 'Target element selector' }
          },
          required: ['fromSelector', 'toSelector']
        }
      },
      {
        name: 'auth',
        description: 'Manage PRO authentication',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['login', 'logout', 'status'] }
          },
          required: ['action']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await backend.callTool(name, args);
    return {
      content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Superior Browser MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
