// Superior Browser MCP - Firefox Extension Background Script (Manifest V2)

let wsConnection = null;
let isConnected = false;
let reconnectTimer = null;
let currentPort = 5555;
let clientId = 'firefox_' + Date.now();
let requestIdCounter = 0;

const WS_URL = `ws://localhost:${currentPort}`;
const MAX_RECONNECT_DELAY = 5000;
const RECONNECT_BASE_DELAY = 1000;
let reconnectAttempts = 0;

function connect() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    wsConnection = new WebSocket(WS_URL);

    wsConnection.onopen = function() {
      console.log('[Superior MCP] Connected to MCP server');
      isConnected = true;
      reconnectAttempts = 0;
      updateIcon('connected');
      sendToServer({ type: 'ready', clientId: clientId });
    };

    wsConnection.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[Superior MCP] Error parsing message:', error);
      }
    };

    wsConnection.onclose = function() {
      console.log('[Superior MCP] Disconnected from MCP server');
      isConnected = false;
      updateIcon('disconnected');
      scheduleReconnect();
    };

    wsConnection.onerror = function(error) {
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

  console.log('[Superior MCP] Reconnecting in ' + delay + 'ms (attempt ' + reconnectAttempts + ')');

  reconnectTimer = setTimeout(function() {
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

function sendResponse(requestId, result, error) {
  sendToServer({
    type: 'response',
    id: requestId,
    payload: {
      result: result,
      error: error
    }
  });
}

function handleMessage(message) {
  var type = message.type;
  var id = message.id;
  var tool = message.tool;
  var args = message.args;

  if (type !== 'request') return;

  var requestId = id;
  var requestArgs = args;
  var requestTool = tool;

  switch (requestTool) {
    case 'browser_tabs':
      handleBrowserTabs(requestId, requestArgs);
      break;
    case 'browser_navigate':
      handleBrowserNavigate(requestId, requestArgs);
      break;
    case 'browser_snapshot':
      handleBrowserSnapshot(requestId);
      break;
    case 'browser_take_screenshot':
      handleBrowserScreenshot(requestId, requestArgs);
      break;
    case 'browser_extract_content':
      handleBrowserExtractContent(requestId, requestArgs);
      break;
    case 'browser_interact':
      handleBrowserInteract(requestId, requestArgs);
      break;
    case 'browser_fill_form':
      handleBrowserFillForm(requestId, requestArgs);
      break;
    case 'browser_evaluate':
      handleBrowserEvaluate(requestId, requestArgs);
      break;
    default:
      sendResponse(requestId, null, 'Unknown tool: ' + requestTool);
  }
}

function handleBrowserTabs(id, args) {
  var action = args.action;
  var url = args.url;
  var index = args.index;

  if (action === 'list') {
    browser.tabs.query({}).then(function(tabs) {
      var tabList = tabs.map(function(tab, i) {
        return {
          index: i,
          id: tab.id,
          title: tab.title,
          url: tab.url,
          active: tab.active
        };
      });
      sendResponse(id, { status: 'success', tabs: tabList, count: tabList.length });
    });
  } else if (action === 'new') {
    browser.tabs.create({ url: url || 'about:blank' }).then(function(tab) {
      sendResponse(id, { status: 'success', tab: { index: tab.index, id: tab.id, url: tab.url } });
    });
  } else if (action === 'attach') {
    browser.tabs.query({}).then(function(tabs) {
      if (index !== undefined && index < tabs.length) {
        var tab = tabs[index];
        browser.tabs.update(tab.id, { active: true }).then(function() {
          sendResponse(id, { status: 'success', tab: { index: tab.index, id: tab.id, url: tab.url } });
        });
      } else {
        sendResponse(id, null, 'Tab index ' + index + ' not found');
      }
    });
  } else if (action === 'close') {
    browser.tabs.query({}).then(function(tabs) {
      if (index !== undefined && index < tabs.length) {
        var tab = tabs[index];
        browser.tabs.remove(tab.id).then(function() {
          sendResponse(id, { status: 'success', closed: tab.id });
        });
      } else {
        sendResponse(id, null, 'Tab index ' + index + ' not found');
      }
    });
  } else {
    sendResponse(id, null, 'Unknown tabs action: ' + action);
  }
}

function handleBrowserNavigate(id, args) {
  var action = args.action;
  var url = args.url;

  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];

    if (action === 'url') {
      if (!url) {
        sendResponse(id, null, 'URL is required for navigate action');
        return;
      }
      browser.tabs.update(activeTab.id, { url: url }).then(function() {
        sendResponse(id, { status: 'success', url: url });
      });
    } else if (action === 'back') {
      browser.tabs.goBack(activeTab.id).then(function() {
        sendResponse(id, { status: 'success', action: 'back' });
      });
    } else if (action === 'forward') {
      browser.tabs.goForward(activeTab.id).then(function() {
        sendResponse(id, { status: 'success', action: 'forward' });
      });
    } else if (action === 'reload') {
      browser.tabs.reload(activeTab.id).then(function() {
        sendResponse(id, { status: 'success', action: 'reload' });
      });
    } else {
      sendResponse(id, null, 'Unknown navigate action: ' + action);
    }
  });
}

function handleBrowserSnapshot(id) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];

    browser.tabs.executeScript(activeTab.id, {
      code: `
        (function() {
          function extractText(element, depth) {
            if (depth > 10) return '';
            var skipTags = ['script', 'style', 'noscript', 'svg', 'canvas'];
            if (skipTags.includes(element.tagName.toLowerCase())) return '';
            var style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return '';
            var text = '';
            element.childNodes.forEach(function(node) {
              if (node.nodeType === Node.TEXT_NODE) {
                var trimmed = node.textContent.trim();
                if (trimmed) text += trimmed + ' ';
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                text += extractText(node, depth + 1);
              }
            });
            return text;
          }
          var mainContent = document.querySelector('main, [role="main"], #content, .content, article') || document.body;
          return { title: document.title, url: window.location.href, text: extractText(mainContent, 0).trim().substring(0, 10000) };
        })();
      `
    }).then(function(results) {
      sendResponse(id, { status: 'success', content: results[0] });
    }).catch(function(error) {
      sendResponse(id, null, 'Snapshot failed: ' + error.message);
    });
  });
}

function handleBrowserScreenshot(id, args) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    browser.tabs.captureVisibleTab(null, {
      format: args.type === 'png' ? 'png' : 'jpeg',
      quality: args.quality || 80
    }).then(function(dataUrl) {
      sendResponse(id, { status: 'success', screenshot: dataUrl, message: 'Screenshot captured successfully' });
    }).catch(function(error) {
      sendResponse(id, null, 'Screenshot failed: ' + error.message);
    });
  });
}

function handleBrowserExtractContent(id, args) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];

    browser.tabs.executeScript(activeTab.id, {
      code: '(' + function(options) {
        var mode = options.mode || 'auto';
        var selector = options.selector;
        var max_lines = options.max_lines || 500;
        var offset = options.offset || 0;

        function htmlToMarkdown(element) {
          if (!element) return '';
          var markdown = '';
          element.childNodes.forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) {
              var text = node.textContent.trim();
              if (text) markdown += text + '\n\n';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              var tag = node.tagName.toLowerCase();
              switch (tag) {
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                  var level = parseInt(tag[1]);
                  var headingText = node.textContent.trim();
                  if (headingText) markdown += '#'.repeat(level) + ' ' + headingText + '\n\n';
                  break;
                case 'p':
                  var pText = node.textContent.trim();
                  if (pText) markdown += pText + '\n\n';
                  break;
                case 'a':
                  var linkText = node.textContent.trim();
                  var href = node.href;
                  if (linkText) markdown += '[' + linkText + '](' + href + ')';
                  break;
                case 'img':
                  var alt = node.alt || '';
                  var src = node.src || '';
                  if (alt || src) markdown += '![' + alt + '](' + src + ')\n\n';
                  break;
                case 'ul': case 'ol':
                  var items = Array.from(node.querySelectorAll('li'));
                  items.forEach(function(item, i) {
                    var prefix = tag === 'ul' ? '- ' : (i + 1) + '. ';
                    markdown += prefix + item.textContent.trim() + '\n';
                  });
                  markdown += '\n';
                  break;
                case 'table':
                  var rows = Array.from(node.querySelectorAll('tr'));
                  rows.forEach(function(row, rowIndex) {
                    var cells = Array.from(row.querySelectorAll('th, td'));
                    var cellTexts = cells.map(function(cell) { return cell.textContent.trim(); });
                    markdown += '| ' + cellTexts.join(' | ') + ' |\n';
                    if (rowIndex === 0 && row.querySelector('th')) {
                      markdown += '| ' + cellTexts.map(function() { return '---'; }).join(' | ') + ' |\n';
                    }
                  });
                  markdown += '\n';
                  break;
                default:
                  markdown += htmlToMarkdown(node);
              }
            }
          });
          return markdown;
        }

        var targetElement;
        var detectedElement = '';

        if (mode === 'selector' && selector) {
          targetElement = document.querySelector(selector);
          detectedElement = selector;
        } else if (mode === 'full') {
          targetElement = document.body;
          detectedElement = 'body';
        } else {
          targetElement = document.querySelector('main, [role="main"], #content, .content, article, .post, .article');
          detectedElement = targetElement ? targetElement.tagName.toLowerCase() : 'body';
          if (!targetElement) targetElement = document.body;
        }

        if (!targetElement) return { error: 'No content found' };

        var markdown = htmlToMarkdown(targetElement);
        var lines = markdown.split('\n');
        var totalLines = lines.length;
        var extractedLines = lines.slice(offset, offset + max_lines);

        return {
          status: 'success',
          mode: mode,
          detectedElement: detectedElement,
          totalLines: totalLines,
          showingLines: (offset + 1) + '-' + Math.min(offset + max_lines, totalLines),
          content: extractedLines.join('\n'),
          truncated: totalLines > offset + max_lines
        };
      } + ')(' + JSON.stringify(args) + ');'
    }).then(function(results) {
      sendResponse(id, results[0]);
    }).catch(function(error) {
      sendResponse(id, null, 'Content extraction failed: ' + error.message);
    });
  });
}

function handleBrowserInteract(id, args) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];
    var actions = args.actions;
    var onError = args.onError || 'stop';

    var results = [];
    var currentIndex = 0;

    function processNext() {
      if (currentIndex >= actions.length) {
        sendResponse(id, {
          status: 'success',
          total: results.length,
          succeeded: results.filter(function(r) { return r.success; }).length,
          failed: results.filter(function(r) { return !r.success; }).length,
          results: results
        });
        return;
      }

      var action = actions[currentIndex];
      currentIndex++;

      executeAction(activeTab.id, action).then(function(result) {
        results.push(result);
        if (!result.success && onError === 'stop') {
          sendResponse(id, {
            status: 'success',
            total: results.length,
            succeeded: results.filter(function(r) { return r.success; }).length,
            failed: results.filter(function(r) { return !r.success; }).length,
            results: results
          });
        } else {
          processNext();
        }
      }).catch(function(error) {
        results.push({ action: action.type, success: false, error: error.message });
        if (onError === 'stop') {
          sendResponse(id, {
            status: 'success',
            total: results.length,
            succeeded: results.filter(function(r) { return r.success; }).length,
            failed: results.filter(function(r) { return !r.success; }).length,
            results: results
          });
        } else {
          processNext();
        }
      });
    }

    processNext();
  });
}

function executeAction(tabId, action) {
  var actionCode = '(' + function(action) {
    function findElement(selector) {
      try {
        return document.querySelector(selector);
      } catch (error) {
        return null;
      }
    }

    switch (action.type) {
      case 'click':
        var el = findElement(action.selector);
        if (!el) return { success: false, error: 'Element not found: ' + action.selector };
        el.click();
        return { success: true, action: 'click', selector: action.selector };

      case 'type':
        var el = findElement(action.selector);
        if (!el) return { success: false, error: 'Element not found: ' + action.selector };
        el.focus();
        el.value = (el.value || '') + action.text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, action: 'type', selector: action.selector, text: action.text };

      case 'clear':
        var el = findElement(action.selector);
        if (!el) return { success: false, error: 'Element not found: ' + action.selector };
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true, action: 'clear', selector: action.selector };

      case 'press_key':
        var event = new KeyboardEvent('keydown', { key: action.key, bubbles: true });
        document.dispatchEvent(event);
        return { success: true, action: 'press_key', key: action.key };

      case 'hover':
        var el = findElement(action.selector);
        if (!el) return { success: false, error: 'Element not found: ' + action.selector };
        var rect = el.getBoundingClientRect();
        var event = new MouseEvent('mouseover', {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        });
        el.dispatchEvent(event);
        return { success: true, action: 'hover', selector: action.selector };

      case 'wait':
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve({ success: true, action: 'wait', timeout: action.timeout || 1000 });
          }, action.timeout || 1000);
        });

      case 'scroll_to':
        var el = findElement(action.selector);
        if (!el) return { success: false, error: 'Element not found: ' + action.selector };
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { success: true, action: 'scroll_to', selector: action.selector };

      case 'scroll_by':
        window.scrollBy({ top: action.y || 0, left: action.x || 0, behavior: 'smooth' });
        return { success: true, action: 'scroll_by', x: action.x, y: action.y };

      case 'select_option':
        var el = findElement(action.selector);
        if (!el || el.tagName.toLowerCase() !== 'select') {
          return { success: false, error: 'Select element not found: ' + action.selector };
        }
        var options = Array.from(el.options);
        var option = options.find(function(opt) {
          return opt.value === action.value || opt.text === action.value;
        });
        if (option) {
          el.value = option.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, action: 'select_option', selector: action.selector, value: action.value };
        }
        return { success: false, error: 'Option not found: ' + action.value };

      default:
        return { success: false, error: 'Unknown action type: ' + action.type };
    }
  } + ')(' + JSON.stringify(action) + ');';

  return browser.tabs.executeScript(tabId, { code: actionCode }).then(function(results) {
    return results[0];
  });
}

function handleBrowserFillForm(id, args) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];
    var fields = args.fields;

    browser.tabs.executeScript(activeTab.id, {
      code: '(' + function(fields) {
        var results = [];
        fields.forEach(function(field) {
          var el = document.querySelector(field.selector);
          if (!el) {
            results.push({ selector: field.selector, success: false, error: 'Element not found' });
            return;
          }

          if (el.tagName.toLowerCase() === 'select') {
            var options = Array.from(el.options);
            var option = options.find(function(opt) {
              return opt.value === field.value || opt.text === field.value;
            });
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

        return { success: true, filled: results.filter(function(r) { return r.success; }).length, results: results };
      } + ')(' + JSON.stringify(fields) + ');'
    }).then(function(results) {
      sendResponse(id, results[0]);
    }).catch(function(error) {
      sendResponse(id, null, 'Form fill failed: ' + error.message);
    });
  });
}

function handleBrowserEvaluate(id, args) {
  browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
    var activeTab = tabs[0];
    var func = args.function;
    var expression = args.expression;

    var code = func || expression;
    browser.tabs.executeScript(activeTab.id, { code: code }).then(function(results) {
      sendResponse(id, { status: 'success', result: results[0] });
    }).catch(function(error) {
      sendResponse(id, null, 'Evaluation failed: ' + error.message);
    });
  });
}

function updateIcon(status) {
  var title = 'Superior Browser MCP: ' + (status === 'connected' ? 'Connected' : 'Disconnected');
  browser.browserAction.setTitle({ title: title });
}

browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
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

connect();
updateIcon('connecting');