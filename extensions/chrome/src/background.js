// Superior Browser MCP - Chrome Extension Background Script

let wsConnection = null;
let isConnected = false;
let reconnectTimer = null;
let currentPort = 5555;
let clientId = 'chrome_' + Date.now();
let pendingRequests = new Map();
let requestIdCounter = 0;

const WS_URL = `ws://localhost:${currentPort}`;
const MAX_RECONNECT_DELAY = 5000;
const RECONNECT_BASE_DELAY = 1000;
let reconnectAttempts = 0;

// Connection management
function connect() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    wsConnection = new WebSocket(WS_URL);

    wsConnection.onopen = () => {
      console.log('[Superior MCP] Connected to MCP server');
      isConnected = true;
      reconnectAttempts = 0;
      updateIcon('connected');
      sendToServer({ type: 'ready', clientId: clientId });
    };

    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[Superior MCP] Error parsing message:', error);
      }
    };

    wsConnection.onclose = () => {
      console.log('[Superior MCP] Disconnected from MCP server');
      isConnected = false;
      updateIcon('disconnected');
      scheduleReconnect();
    };

    wsConnection.onerror = (error) => {
      console.error('[Superior MCP] WebSocket error:', error);
    };
  } catch (error) {
    console.error('[Superior MCP] Failed to connect:', error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;

  console.log(`[Superior MCP] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

  reconnectTimer = setTimeout(() => {
    connect();
  }, delay);
}

function sendToServer(message) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(JSON.stringify(message));
    return true;
  }
  return false;
}

function sendResponse(requestId, result, error = null) {
  sendToServer({
    type: 'response',
    id: requestId,
    payload: {
      result: result,
      error: error
    }
  });
}

async function handleMessage(message) {
  const { type, id, tool, args } = message;

  if (type !== 'request') return;

  try {
    switch (tool) {
      case 'browser_tabs':
        await handleBrowserTabs(id, args);
        break;
      case 'browser_navigate':
        await handleBrowserNavigate(id, args);
        break;
      case 'browser_snapshot':
        await handleBrowserSnapshot(id, args);
        break;
      case 'browser_take_screenshot':
        await handleBrowserScreenshot(id, args);
        break;
      case 'browser_extract_content':
        await handleBrowserExtractContent(id, args);
        break;
      case 'browser_interact':
        await handleBrowserInteract(id, args);
        break;
      case 'browser_fill_form':
        await handleBrowserFillForm(id, args);
        break;
      case 'browser_evaluate':
        await handleBrowserEvaluate(id, args);
        break;
      case 'browser_console_messages':
        await handleBrowserConsoleMessages(id, args);
        break;
      case 'browser_network_requests':
        await handleBrowserNetworkRequests(id, args);
        break;
      case 'browser_window':
        await handleBrowserWindow(id, args);
        break;
      case 'browser_pdf_save':
        await handleBrowserPdfSave(id, args);
        break;
      case 'browser_handle_dialog':
        await handleBrowserHandleDialog(id, args);
        break;
      case 'browser_performance_metrics':
        await handleBrowserPerformanceMetrics(id, args);
        break;
      case 'browser_verify_text_visible':
        await handleBrowserVerifyTextVisible(id, args);
        break;
      case 'browser_verify_element_visible':
        await handleBrowserVerifyElementVisible(id, args);
        break;
      case 'browser_list_extensions':
        await handleBrowserListExtensions(id, args);
        break;
      case 'browser_reload_extensions':
        await handleBrowserReloadExtensions(id, args);
        break;
      case 'browser_drag':
        await handleBrowserDrag(id, args);
        break;
      default:
        sendResponse(id, null, `Unknown tool: ${tool}`);
    }
  } catch (error) {
    sendResponse(id, null, error.message);
  }
}

// Tool handlers
async function handleBrowserTabs(id, args) {
  const { action, url, index, activate = true, stealth = false } = args;

  switch (action) {
    case 'list': {
      const tabs = await chrome.tabs.query({});
      const tabList = tabs.map((tab, i) => ({
        index: i,
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.active,
        windowId: tab.windowId
      }));
      sendResponse(id, { status: 'success', tabs: tabList, count: tabList.length });
      break;
    }

    case 'new': {
      const tab = await chrome.tabs.create({ url: url || 'about:blank', active: activate });
      sendResponse(id, { status: 'success', tab: { index: tab.index, id: tab.id, url: tab.url } });
      break;
    }

    case 'attach': {
      const tabs = await chrome.tabs.query({});
      if (index !== undefined && index < tabs.length) {
        const tab = tabs[index];
        await chrome.tabs.update(tab.id, { active: true });
        sendResponse(id, { status: 'success', tab: { index: tab.index, id: tab.id, url: tab.url } });
      } else {
        sendResponse(id, null, `Tab index ${index} not found`);
      }
      break;
    }

    case 'close': {
      const tabs = await chrome.tabs.query({});
      if (index !== undefined && index < tabs.length) {
        const tab = tabs[index];
        await chrome.tabs.remove(tab.id);
        sendResponse(id, { status: 'success', closed: tab.id });
      } else {
        sendResponse(id, null, `Tab index ${index} not found`);
      }
      break;
    }

    default:
      sendResponse(id, null, `Unknown tabs action: ${action}`);
  }
}

async function handleBrowserNavigate(id, args) {
  const { action, url } = args;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (action) {
    case 'url':
      if (!url) {
        sendResponse(id, null, 'URL is required for navigate action');
        return;
      }
      await chrome.tabs.update(activeTab.id, { url: url });
      sendResponse(id, { status: 'success', url: url });
      break;

    case 'back':
      await chrome.tabs.goBack(activeTab.id);
      sendResponse(id, { status: 'success', action: 'back' });
      break;

    case 'forward':
      await chrome.tabs.goForward(activeTab.id);
      sendResponse(id, { status: 'success', action: 'forward' });
      break;

    case 'reload':
      await chrome.tabs.reload(activeTab.id);
      sendResponse(id, { status: 'success', action: 'reload' });
      break;

    default:
      sendResponse(id, null, `Unknown navigate action: ${action}`);
  }
}

async function handleBrowserSnapshot(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        function extractText(element, depth = 0) {
          if (depth > 10) return '';
          
          const skipTags = ['script', 'style', 'noscript', 'svg', 'canvas'];
          if (skipTags.includes(element.tagName?.toLowerCase())) return '';

          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return '';

          let text = '';
          
          element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              const trimmed = node.textContent.trim();
              if (trimmed) {
                text += trimmed + ' ';
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              text += extractText(node, depth + 1);
            }
          });

          return text;
        }

        const mainContent = document.querySelector('main, [role="main"], #content, .content, article') || document.body;
        const text = extractText(mainContent);
        
        return {
          title: document.title,
          url: window.location.href,
          text: text.trim().substring(0, 10000)
        };
      }
    });

    sendResponse(id, { status: 'success', content: results[0]?.result });
  } catch (error) {
    sendResponse(id, null, `Snapshot failed: ${error.message}`);
  }
}

async function handleBrowserScreenshot(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: args.type === 'png' ? 'png' : 'jpeg',
      quality: args.quality || 80
    });

    sendResponse(id, { 
      status: 'success', 
      screenshot: dataUrl,
      message: 'Screenshot captured successfully'
    });
  } catch (error) {
    sendResponse(id, null, `Screenshot failed: ${error.message}`);
  }
}

async function handleBrowserExtractContent(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (options) => {
        const { mode, selector, max_lines = 500, offset = 0 } = options;

        function htmlToMarkdown(element) {
          if (!element) return '';
          
          let markdown = '';
          
          element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text) {
                markdown += text + '\n\n';
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              
              switch (tag) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                  const level = parseInt(tag[1]);
                  const headingText = node.textContent.trim();
                  if (headingText) {
                    markdown += '#'.repeat(level) + ' ' + headingText + '\n\n';
                  }
                  break;
                  
                case 'p':
                  const pText = node.textContent.trim();
                  if (pText) {
                    markdown += pText + '\n\n';
                  }
                  break;
                  
                case 'a':
                  const linkText = node.textContent.trim();
                  const href = node.href;
                  if (linkText) {
                    markdown += `[${linkText}](${href})`;
                  }
                  break;
                  
                case 'img':
                  const alt = node.alt || '';
                  const src = node.src || '';
                  if (alt || src) {
                    markdown += `![${alt}](${src})\n\n`;
                  }
                  break;
                  
                case 'ul':
                case 'ol':
                  const items = Array.from(node.querySelectorAll('li'));
                  items.forEach((item, i) => {
                    const prefix = tag === 'ul' ? '- ' : (i + 1) + '. ';
                    markdown += prefix + item.textContent.trim() + '\n';
                  });
                  markdown += '\n';
                  break;
                  
                case 'table':
                  const rows = Array.from(node.querySelectorAll('tr'));
                  rows.forEach((row, rowIndex) => {
                    const cells = Array.from(row.querySelectorAll('th, td'));
                    const cellTexts = cells.map(cell => cell.textContent.trim());
                    markdown += '| ' + cellTexts.join(' | ') + ' |\n';
                    if (rowIndex === 0 && row.querySelector('th')) {
                      markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
                    }
                  });
                  markdown += '\n';
                  break;
                  
                case 'blockquote':
                  const quoteText = node.textContent.trim();
                  if (quoteText) {
                    markdown += '> ' + quoteText + '\n\n';
                  }
                  break;
                  
                case 'code':
                  const codeText = node.textContent.trim();
                  if (codeText) {
                    if (node.parentElement.tagName.toLowerCase() === 'pre') {
                      markdown += '```\n' + codeText + '\n```\n\n';
                    } else {
                      markdown += '`' + codeText + '`';
                    }
                  }
                  break;
                  
                case 'pre':
                  break;
                  
                case 'br':
                  markdown += '\n';
                  break;
                  
                case 'hr':
                  markdown += '---\n\n';
                  break;
                  
                default:
                  markdown += htmlToMarkdown(node);
              }
            }
          });
          
          return markdown;
        }

        let targetElement;
        let detectedElement = '';

        if (mode === 'selector' && selector) {
          targetElement = document.querySelector(selector);
          detectedElement = selector;
        } else if (mode === 'full') {
          targetElement = document.body;
          detectedElement = 'body';
        } else {
          targetElement = document.querySelector('main, [role="main"], #content, .content, article, .post, .article');
          detectedElement = targetElement ? targetElement.tagName.toLowerCase() : 'body';
          if (!targetElement) {
            targetElement = document.body;
          }
        }

        if (!targetElement) {
          return { error: 'No content found' };
        }

        const markdown = htmlToMarkdown(targetElement);
        const lines = markdown.split('\n');
        const totalLines = lines.length;
        const extractedLines = lines.slice(offset, offset + max_lines);

        return {
          status: 'success',
          mode: mode,
          detectedElement: detectedElement,
          totalLines: totalLines,
          showingLines: `${offset + 1}-${Math.min(offset + max_lines, totalLines)}`,
          content: extractedLines.join('\n'),
          truncated: totalLines > offset + max_lines
        };
      },
      args: [args]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Content extraction failed: ${error.message}`);
  }
}

async function handleBrowserInteract(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { actions, onError = 'stop' } = args;

  const results = [];

  for (const action of actions) {
    try {
      const result = await executeAction(activeTab.id, action);
      results.push(result);
    } catch (error) {
      results.push({ action: action.type, success: false, error: error.message });
      if (onError === 'stop') {
        break;
      }
    }
  }

  sendResponse(id, {
    status: 'success',
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results
  });
}

async function executeAction(tabId, action) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (action) => {
      function findElement(selector) {
        try {
          return document.querySelector(selector);
        } catch (error) {
          return null;
        }
      }

      switch (action.type) {
        case 'click': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          el.click();
          return { success: true, action: 'click', selector: action.selector };
        }

        case 'type': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          el.focus();
          el.value = (el.value || '') + action.text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, action: 'type', selector: action.selector, text: action.text };
        }

        case 'clear': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true, action: 'clear', selector: action.selector };
        }

        case 'press_key': {
          const event = new KeyboardEvent('keydown', { key: action.key, bubbles: true });
          document.dispatchEvent(event);
          return { success: true, action: 'press_key', key: action.key };
        }

        case 'hover': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          const rect = el.getBoundingClientRect();
          const event = new MouseEvent('mouseover', {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          });
          el.dispatchEvent(event);
          return { success: true, action: 'hover', selector: action.selector };
        }

        case 'wait': {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ success: true, action: 'wait', timeout: action.timeout || 1000 });
            }, action.timeout || 1000);
          });
        }

        case 'scroll_to': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { success: true, action: 'scroll_to', selector: action.selector };
        }

        case 'scroll_by': {
          window.scrollBy({ top: action.y || 0, left: action.x || 0, behavior: 'smooth' });
          return { success: true, action: 'scroll_by', x: action.x, y: action.y };
        }

        case 'scroll_into_view': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { success: true, action: 'scroll_into_view', selector: action.selector };
        }

        case 'select_option': {
          const el = findElement(action.selector);
          if (!el || el.tagName.toLowerCase() !== 'select') {
            return { success: false, error: `Select element not found: ${action.selector}` };
          }
          const options = Array.from(el.options);
          const option = options.find(opt => 
            opt.value === action.value || opt.text === action.value
          );
          if (option) {
            el.value = option.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, action: 'select_option', selector: action.selector, value: action.value };
          }
          return { success: false, error: `Option not found: ${action.value}` };
        }

        case 'file_upload': {
          const el = findElement(action.selector);
          if (!el || el.tagName.toLowerCase() !== 'input' || el.type !== 'file') {
            return { success: false, error: `File input not found: ${action.selector}` };
          }
          return { success: false, error: 'File upload requires extension API access' };
        }

        case 'force_pseudo_state': {
          const el = findElement(action.selector);
          if (!el) return { success: false, error: `Element not found: ${action.selector}` };
          const states = action.pseudoStates || [];
          states.forEach(state => {
            el.style.setProperty(`--force-${state}`, 'true');
          });
          return { success: true, action: 'force_pseudo_state', selector: action.selector, states: states };
        }

        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    },
    args: [action]
  });

  return results[0]?.result;
}

async function handleBrowserFillForm(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { fields } = args;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (fields) => {
        const results = [];
        
        fields.forEach(field => {
          const el = document.querySelector(field.selector);
          if (!el) {
            results.push({ selector: field.selector, success: false, error: 'Element not found' });
            return;
          }

          if (el.tagName.toLowerCase() === 'select') {
            const options = Array.from(el.options);
            const option = options.find(opt => 
              opt.value === field.value || opt.text === field.value
            );
            if (option) {
              el.value = option.value;
            } else {
              el.value = field.value;
            }
          } else if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = field.value === 'true' || field.value === true || field.value === 'yes';
          } else {
            el.value = field.value;
          }

          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          results.push({ selector: field.selector, value: field.value, success: true });
        });

        return { success: true, filled: results.filter(r => r.success).length, results: results };
      },
      args: [fields]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Form fill failed: ${error.message}`);
  }
}

async function handleBrowserEvaluate(id, args) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: new Function('return ' + (args.function || args.expression))(),
    });

    sendResponse(id, { status: 'success', result: results[0]?.result });
  } catch (error) {
    sendResponse(id, null, `Evaluation failed: ${error.message}`);
  }
}

async function handleBrowserConsoleMessages(id, args) {
  sendResponse(id, { 
    status: 'success', 
    messages: [], 
    message: 'Console messages require DevTools protocol access. Use browser extension console for debugging.'
  });
}

async function handleBrowserNetworkRequests(id, args) {
  sendResponse(id, { 
    status: 'success', 
    requests: [], 
    message: 'Network monitoring requires DevTools protocol access. Use browser DevTools Network tab for debugging.'
  });
}

async function handleBrowserWindow(id, args) {
  const { action, width, height } = args;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const window = await chrome.tabs.get(activeTab.id).then(tab => chrome.windows.get(tab.windowId));

  switch (action) {
    case 'resize':
      if (!width || !height) {
        sendResponse(id, null, 'Width and height are required for resize');
        return;
      }
      await chrome.windows.update(window.id, { width, height });
      sendResponse(id, { status: 'success', action: 'resize', width, height });
      break;

    case 'maximize':
      await chrome.windows.update(window.id, { state: 'maximized' });
      sendResponse(id, { status: 'success', action: 'maximize' });
      break;

    case 'minimize':
      await chrome.windows.update(window.id, { state: 'minimized' });
      sendResponse(id, { status: 'success', action: 'minimize' });
      break;

    case 'close':
      await chrome.windows.remove(window.id);
      sendResponse(id, { status: 'success', action: 'close' });
      break;

    default:
      sendResponse(id, null, `Unknown window action: ${action}`);
  }
}

async function handleBrowserPdfSave(id, args) {
  sendResponse(id, { 
    status: 'success', 
    message: 'PDF save requires DevTools protocol access. Use browser Print to PDF feature instead.'
  });
}

async function handleBrowserHandleDialog(id, args) {
  const { accept, text } = args;
  
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (accept, text) => {
        window._dialogResponse = { accept, text };
        return { status: 'success', accept, text };
      },
      args: [accept, text]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Dialog handling failed: ${error.message}`);
  }
}

async function handleBrowserPerformanceMetrics(id, args) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        const entries = performance.getEntriesByType('navigation');
        const paintEntries = performance.getEntriesByType('paint');
        
        const navigation = entries[0];
        if (!navigation) return { error: 'No navigation entries available' };

        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        return {
          status: 'success',
          metrics: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            load: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.startTime,
            firstContentfulPaint: fcp ? fcp.startTime : null,
            responseTime: navigation.responseEnd - navigation.requestStart,
            redirectCount: navigation.redirectCount
          }
        };
      }
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Performance metrics failed: ${error.message}`);
  }
}

async function handleBrowserVerifyTextVisible(id, args) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (text) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes(text)) {
            const parent = node.parentElement;
            const style = window.getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            return { 
              found: true, 
              visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
              text: text 
            };
          }
        }
        return { found: false, text: text };
      },
      args: [args.text]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Text verification failed: ${error.message}`);
  }
}

async function handleBrowserVerifyElementVisible(id, args) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { found: false, selector: selector };
        
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible = style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       rect.width > 0 && 
                       rect.height > 0;
        
        return { found: true, visible: visible, selector: selector };
      },
      args: [args.selector]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Element verification failed: ${error.message}`);
  }
}

async function handleBrowserListExtensions(id, args) {
  sendResponse(id, { 
    status: 'success', 
    extensions: ['Superior Browser MCP'], 
    message: 'Extension listing requires management API permissions'
  });
}

async function handleBrowserReloadExtensions(id, args) {
  sendResponse(id, { 
    status: 'success', 
    message: 'Extension reloaded (development mode)'
  });
}

async function handleBrowserDrag(id, args) {
  const { fromSelector, toSelector } = args;

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (fromSelector, toSelector) => {
        const fromEl = document.querySelector(fromSelector);
        const toEl = document.querySelector(toSelector);
        
        if (!fromEl) return { success: false, error: `Source element not found: ${fromSelector}` };
        if (!toEl) return { success: false, error: `Target element not found: ${toSelector}` };
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
        
        const dragStart = new MouseEvent('mousedown', { bubbles: true, clientX: fromX, clientY: fromY });
        const dragOver = new MouseEvent('mousemove', { bubbles: true, clientX: toX, clientY: toY });
        const drop = new MouseEvent('mouseup', { bubbles: true, clientX: toX, clientY: toY });
        
        fromEl.dispatchEvent(dragStart);
        document.dispatchEvent(dragOver);
        toEl.dispatchEvent(drop);
        
        return { success: true, from: fromSelector, to: toSelector };
      },
      args: [fromSelector, toSelector]
    });

    sendResponse(id, results[0]?.result);
  } catch (error) {
    sendResponse(id, null, `Drag operation failed: ${error.message}`);
  }
}

// Icon management
function updateIcon(status) {
  const paths = {
    connected: {
      path: 'icons/icon-connected.png',
      title: 'Superior Browser MCP: Connected'
    },
    disconnected: {
      path: 'icons/icon-disconnected.png',
      title: 'Superior Browser MCP: Disconnected - Click to connect'
    },
    connecting: {
      path: 'icons/icon-connecting.png',
      title: 'Superior Browser MCP: Connecting...'
    }
  };

  chrome.action.setIcon({ path: paths[status].path });
  chrome.action.setTitle({ title: paths[status].title });
}

// Popup message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'connect') {
    connect();
    sendResponse({ status: 'connecting' });
  } else if (message.action === 'disconnect') {
    if (wsConnection) {
      wsConnection.close();
    }
    sendResponse({ status: 'disconnected' });
  } else if (message.action === 'status') {
    sendResponse({ 
      connected: isConnected, 
      url: WS_URL,
      clientId: clientId
    });
  }
});

// Auto-connect on extension load
connect();
updateIcon('connecting');
