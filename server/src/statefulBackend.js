const WebSocket = require('ws');
const { ExtensionServer } = require('./extensionServer.js');
const { UnifiedBackend } = require('./unifiedBackend.js');

class StatefulBackend {
  constructor() {
    this.enabled = false;
    this.clientId = null;
    this.wsConnection = null;
    this.extensionServer = null;
    this.unifiedBackend = null;
    this.overlayMap = new Map();
    this.overlayCounter = 0;
    this.port = process.env.MCP_PORT || 5555;
    this.actionQueue = [];
    this.isProcessing = false;
  }

  async callTool(name, args = {}) {
    switch (name) {
      case 'enable':
        return await this.enable(args);
      case 'disable':
        return this.disable();
      case 'status':
        return this.getStatus();
      case 'auth':
        return this.handleAuth(args);
      case 'browser_tabs':
        return this.forwardToBackend('browser_tabs', args);
      case 'browser_navigate':
        return this.forwardToBackend('browser_navigate', args);
      case 'browser_snapshot':
        return this.forwardToBackend('browser_snapshot', args);
      case 'browser_take_screenshot':
        return this.forwardToBackend('browser_take_screenshot', args);
      case 'browser_extract_content':
        return this.forwardToBackend('browser_extract_content', args);
      case 'browser_interact':
        return this.forwardToBackend('browser_interact', args);
      case 'browser_fill_form':
        return this.forwardToBackend('browser_fill_form', args);
      case 'browser_evaluate':
        return this.forwardToBackend('browser_evaluate', args);
      case 'browser_console_messages':
        return this.forwardToBackend('browser_console_messages', args);
      case 'browser_network_requests':
        return this.forwardToBackend('browser_network_requests', args);
      case 'browser_window':
        return this.forwardToBackend('browser_window', args);
      case 'browser_pdf_save':
        return this.forwardToBackend('browser_pdf_save', args);
      case 'browser_handle_dialog':
        return this.forwardToBackend('browser_handle_dialog', args);
      case 'browser_performance_metrics':
        return this.forwardToBackend('browser_performance_metrics', args);
      case 'browser_verify_text_visible':
        return this.forwardToBackend('browser_verify_text_visible', args);
      case 'browser_verify_element_visible':
        return this.forwardToBackend('browser_verify_element_visible', args);
      case 'browser_list_extensions':
        return this.forwardToBackend('browser_list_extensions', args);
      case 'browser_reload_extensions':
        return this.forwardToBackend('browser_reload_extensions', args);
      case 'browser_drag':
        return this.forwardToBackend('browser_drag', args);
      
      // Enhanced features
      case 'get_visual_map':
        return this.getVisualMap(args);
      case 'get_interactive_map':
        return this.getInteractiveMap(args);
      case 'get_element_details':
        return this.getElementDetails(args);
      case 'analyze_page':
        return this.analyzePage(args);
      case 'smart_fill_form':
        return this.smartFillForm(args);
      case 'get_form_analysis':
        return this.getFormAnalysis(args);
      case 'click_by_overlay_id':
        return this.clickByOverlayId(args);
      case 'hover_by_overlay_id':
        return this.hoverByOverlayId(args);
      case 'detect_popups':
        return this.detectPopups(args);
      case 'detect_ads':
        return this.detectAds(args);
      case 'manage_cookies':
        return this.manageCookies(args);
      case 'manage_storage':
        return this.manageStorage(args);
      case 'wait_for':
        return this.waitFor(args);
      case 'self_heal_selector':
        return this.selfHealSelector(args);
      case 'get_accessibility_tree':
        return this.getAccessibilityTree(args);
      case 'detect_captcha':
        return this.detectCaptcha();
      case 'detect_login_form':
        return this.detectLoginForm();
      case 'scroll_page':
        return this.scrollPage(args);
      case 'compare_pages':
        return this.comparePages(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async enable(args) {
    if (this.enabled) {
      return { status: 'already_enabled', clientId: this.clientId };
    }

    this.clientId = args.client_id || 'default';
    
    try {
      this.extensionServer = new ExtensionServer({ port: this.port });
      await this.extensionServer.start();
      
      this.unifiedBackend = new UnifiedBackend(this.extensionServer);
      
      this.enabled = true;
      
      return {
        status: 'enabled',
        mode: 'free',
        browser: 'local',
        clientId: this.clientId,
        message: 'Browser automation activated. Use browser_tabs to list/create/attach tabs.'
      };
    } catch (error) {
      throw new Error(`Failed to enable browser automation: ${error.message}`);
    }
  }

  disable() {
    if (!this.enabled) {
      return { status: 'not_enabled' };
    }

    if (this.extensionServer) {
      this.extensionServer.stop();
    }
    
    this.enabled = false;
    this.wsConnection = null;
    this.overlayMap.clear();
    this.overlayCounter = 0;
    
    return { status: 'disabled', message: 'Browser automation deactivated' };
  }

  getStatus() {
    const status = {
      enabled: this.enabled,
      clientId: this.clientId,
      mode: 'free',
      browser: 'local'
    };

    if (this.unifiedBackend) {
      status.connected = this.unifiedBackend.isConnected();
      status.currentTab = this.unifiedBackend.getCurrentTab();
    }

    return status;
  }

  handleAuth(args) {
    return { status: 'not_implemented', message: 'PRO authentication requires cloud relay setup' };
  }

  async forwardToBackend(toolName, args) {
    this.ensureEnabled();
    
    if (!this.unifiedBackend) {
      throw new Error('Backend not initialized. Call enable first.');
    }

    return this.unifiedBackend.callTool(toolName, args);
  }

  async getVisualMap(args = {}) {
    this.ensureEnabled();

    const includeLabels = args.includeLabels !== false;
    const elementTypes = args.elementTypes || null;
    
    const jsCode = `
      (function() {
        const overlayId = 'superior-mcp-overlay-' + Date.now();
        const container = document.createElement('div');
        container.id = overlayId;
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
        
        const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="switch"], [role="textbox"], [onclick], [tabindex="0"], [contenteditable="true"]';
        
        const elements = Array.from(document.querySelectorAll(interactiveSelectors));
        const visibleElements = elements.filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 rect.top >= 0 && rect.top < window.innerHeight;
        });

        const elementTypes = ${elementTypes ? JSON.stringify(elementTypes) : 'null'};
        
        const filteredElements = elementTypes ? visibleElements.filter(el => {
          const type = el.tagName.toLowerCase();
          const role = el.getAttribute('role') || '';
          return elementTypes.some(t => type === t || role === t);
        }) : visibleElements;

        const elementMap = [];
        let counter = 1;
        
        filteredElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          const badge = document.createElement('div');
          badge.style.cssText = \`
            position: absolute;
            left: \${rect.left}px;
            top: \${rect.top}px;
            background: #ff3366;
            color: white;
            font-size: 11px;
            font-weight: bold;
            font-family: monospace;
            padding: 2px 6px;
            border-radius: 4px;
            pointer-events: none;
            z-index: 2147483647;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 2px solid white;
          \`;
          badge.textContent = counter;
          container.appendChild(badge);
          
          if (${includeLabels}) {
            const label = document.createElement('div');
            label.style.cssText = \`
              position: absolute;
              left: \${rect.left}px;
              top: \${rect.top + rect.height + 2}px;
              background: rgba(0,0,0,0.85);
              color: white;
              font-size: 10px;
              font-family: monospace;
              padding: 2px 6px;
              border-radius: 3px;
              pointer-events: none;
              z-index: 2147483647;
              max-width: 200px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            \`;
            label.textContent = el.textContent?.trim().substring(0, 30) || el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('type') || el.tagName.toLowerCase();
            container.appendChild(label);
          }
          
          const cssPath = this.getCSSPath(el);
          elementMap.push({
            id: counter,
            tag: el.tagName.toLowerCase(),
            type: el.type || el.getAttribute('role') || 'element',
            text: el.textContent?.trim().substring(0, 50) || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            name: el.getAttribute('name') || '',
            selector: cssPath,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
          
          counter++;
        });
        
        document.body.appendChild(container);
        
        return {
          overlayId: overlayId,
          totalElements: elementMap.length,
          elements: elementMap,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        };
      })();
    `;

    const result = await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
    
    if (result && result.elements) {
      this.overlayMap.clear();
      result.elements.forEach(el => {
        this.overlayMap.set(el.id, el);
      });
      this.overlayCounter = result.totalElements;
    }

    const screenshotArgs = {
      type: args.type || 'jpeg',
      quality: args.quality || 80,
      fullPage: args.fullPage || false
    };

    if (args.path) {
      screenshotArgs.path = args.path;
    }

    const screenshot = await this.unifiedBackend.callTool('browser_take_screenshot', screenshotArgs);
    
    return {
      status: 'visual_map_captured',
      overlayId: result?.overlayId,
      totalElements: result?.totalElements || 0,
      elements: result?.elements || [],
      viewport: result?.viewport,
      screenshot: screenshot,
      message: `Found ${result?.totalElements || 0} interactive elements. Use click_by_overlay_id or hover_by_overlay_id with the element IDs.`
    };
  }

  async getInteractiveMap(args = {}) {
    this.ensureEnabled();

    const includeHidden = args.includeHidden || false;
    const filterType = args.filterType || null;
    const filterArea = args.filterArea || null;
    const maxElements = args.maxElements || 200;

    const jsCode = `
      (function() {
        function getAccessibleName(el) {
          return el.getAttribute('aria-label') || 
                 el.getAttribute('aria-labelledby') ||
                 el.getAttribute('title') ||
                 el.getAttribute('alt') ||
                 el.getAttribute('placeholder') ||
                 el.getAttribute('name') ||
                 el.textContent?.trim().substring(0, 100) ||
                 '';
        }

        function isInViewport(el) {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }

        function getPageArea(el) {
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          
          if (rect.top < vh * 0.15) return 'header';
          if (rect.top > vh * 0.85) return 'footer';
          if (rect.left < vw * 0.15) return 'sidebar';
          return 'main';
        }

        function getElementCategory(el) {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute('role') || '';
          
          if (tag === 'input') {
            const type = el.type || 'text';
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'submit' || type === 'button') return 'button';
            return 'input-' + type;
          }
          if (tag === 'button') return 'button';
          if (tag === 'select') return 'dropdown';
          if (tag === 'textarea') return 'textarea';
          if (tag === 'a') return 'link';
          if (tag === 'img') return 'image';
          if (tag === 'table') return 'table';
          if (tag === 'form') return 'form';
          if (role === 'dialog' || role === 'alertdialog') return 'modal';
          if (role === 'tab') return 'tab';
          if (role === 'menuitem') return 'menu-item';
          if (role === 'checkbox') return 'checkbox';
          if (role === 'radio') return 'radio';
          if (role === 'switch') return 'switch';
          if (role === 'slider') return 'slider';
          if (role === 'progressbar') return 'progress';
          if (role === 'tooltip') return 'tooltip';
          
          if (el.onclick || el.getAttribute('data-action')) return 'interactive';
          return tag;
        }

        function isElementVisible(el) {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 style.opacity !== '0' &&
                 el.offsetParent !== null;
        }

        function getCSSPath(el) {
          if (!el || el === document.body) return 'body';
          const path = [];
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
              selector += '#' + el.id;
              path.unshift(selector);
              break;
            } else {
              let sibling = el;
              let nth = 1;
              while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling;
                if (sibling.nodeName.toLowerCase() === selector) nth++;
              }
              if (nth > 1) selector += ':nth-of-type(' + nth + ')';
            }
            path.unshift(selector);
            el = el.parentElement;
          }
          return path.join(' > ');
        }

        function isFormElement(el) {
          return ['input', 'select', 'textarea', 'button'].includes(el.tagName.toLowerCase());
        }

        function isLinkElement(el) {
          return el.tagName.toLowerCase() === 'a' && el.href;
        }

        function isButtonElement(el) {
          return el.tagName.toLowerCase() === 'button' || 
                 (el.tagName.toLowerCase() === 'input' && ['submit', 'button', 'reset'].includes(el.type)) ||
                 el.getAttribute('role') === 'button';
        }

        const allInteractive = document.querySelectorAll(
          'a, button, input, select, textarea, form, table, img, ' +
          '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
          '[role="tab"], [role="menuitem"], [role="switch"], [role="textbox"], ' +
          '[role="dialog"], [role="alertdialog"], [role="slider"], ' +
          '[role="progressbar"], [role="tooltip"], [role="navigation"], ' +
          '[role="banner"], [role="main"], [role="contentinfo"], ' +
          '[role="complementary"], [role="search"], [role="form"], ' +
          '[onclick], [tabindex="0"], [contenteditable="true"]'
        );

        const filterType = ${filterType ? JSON.stringify(filterType) : 'null'};
        const filterArea = ${filterArea ? JSON.stringify(filterArea) : 'null'};
        const includeHidden = ${includeHidden};
        const maxElements = ${maxElements};

        const elements = [];
        let id = 1;

        allInteractive.forEach(el => {
          if (elements.length >= maxElements) return;
          
          const visible = isElementVisible(el);
          const inViewport = isInViewport(el);
          
          if (!includeHidden && !visible) return;
          
          const category = getElementCategory(el);
          const area = getPageArea(el);
          
          if (filterType && !category.includes(filterType) && el.tagName.toLowerCase() !== filterType) return;
          if (filterArea && area !== filterArea) return;
          
          const rect = el.getBoundingClientRect();
          const cssPath = getCSSPath(el);
          
          elements.push({
            id: id++,
            category: category,
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            role: el.getAttribute('role') || '',
            name: getAccessibleName(el),
            text: el.textContent?.trim().substring(0, 100) || '',
            placeholder: el.getAttribute('placeholder') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            required: el.required || el.getAttribute('aria-required') === 'true',
            disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
            checked: el.checked,
            value: el.value || '',
            href: el.href || '',
            selector: cssPath,
            area: area,
            visible: visible,
            inViewport: inViewport,
            position: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        });

        return {
          totalElements: elements.length,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          elements: elements
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async getElementDetails(args = {}) {
    this.ensureEnabled();

    let selector = args.selector;
    
    if (args.overlayId && this.overlayMap.has(args.overlayId)) {
      selector = this.overlayMap.get(args.overlayId).selector;
    }

    if (!selector) {
      throw new Error('Either selector or overlayId must be provided');
    }

    const jsCode = `
      (function() {
        const selector = ${JSON.stringify(selector)};
        const el = document.querySelector(selector);
        
        if (!el) return { error: 'Element not found: ' + selector };
        
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        function getAccessibleName(element) {
          return element.getAttribute('aria-label') || 
                 element.getAttribute('title') ||
                 element.getAttribute('alt') ||
                 element.getAttribute('placeholder') ||
                 element.getAttribute('name') ||
                 element.textContent?.trim().substring(0, 100) ||
                 '';
        }

        function getAriaAttributes(element) {
          const attrs = {};
          const ariaPrefix = 'aria-';
          for (let attr of element.attributes) {
            if (attr.name.startsWith(ariaPrefix) || attr.name === 'role') {
              attrs[attr.name] = attr.value;
            }
          }
          return attrs;
        }

        function getValidationInfo(element) {
          if (!['input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) return null;
          
          return {
            required: element.required || element.getAttribute('aria-required') === 'true',
            pattern: element.pattern || null,
            minLength: element.minLength || null,
            maxLength: element.maxLength || null,
            min: element.min || null,
            max: element.max || null,
            step: element.step || null,
            valid: element.validity?.valid,
            validationMessage: element.validationMessage || ''
          };
        }

        const details = {
          found: true,
          selector: selector,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: Array.from(el.classList),
          type: el.type || null,
          role: el.getAttribute('role') || null,
          name: getAccessibleName(el),
          text: el.textContent?.trim().substring(0, 200) || '',
          value: el.value || null,
          checked: el.checked || null,
          disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          validation: getValidationInfo(el),
          children: el.children.length,
          parent: el.parentElement?.tagName.toLowerCase() || null
        };

        if (${args.includeAccessibility || false}) {
          details.accessibility = {
            name: getAccessibleName(el),
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            attributes: getAriaAttributes(el),
            tabIndex: el.tabIndex
          };
        }

        if (${args.includeStyles || false}) {
          details.styles = {
            display: style.display,
            position: style.position,
            visibility: style.visibility,
            opacity: style.opacity,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            zIndex: style.zIndex,
            cursor: style.cursor,
            pointerEvents: style.pointerEvents
          };
        }

        return details;
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async analyzePage(args = {}) {
    this.ensureEnabled();

    const jsCode = `
      (function() {
        function detectForms() {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map((form, i) => ({
            index: i,
            selector: form.id ? '#' + form.id : 'form:nth-of-type(' + (i + 1) + ')',
            action: form.action || '',
            method: form.method || 'get',
            fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
              tag: field.tagName.toLowerCase(),
              type: field.type || 'text',
              name: field.name || '',
              placeholder: field.placeholder || '',
              label: field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '',
              required: field.required || field.getAttribute('aria-required') === 'true',
              value: field.value || ''
            }))
          }));
        }

        function detectNavigation() {
          const navs = Array.from(document.querySelectorAll('nav, [role="navigation"], .nav, .navigation, .menu'));
          return navs.map((nav, i) => ({
            index: i,
            type: 'navigation',
            links: Array.from(nav.querySelectorAll('a')).map(a => ({
              text: a.textContent?.trim() || '',
              href: a.href || ''
            }))
          }));
        }

        function detectTables() {
          const tables = Array.from(document.querySelectorAll('table'));
          return tables.map((table, i) => ({
            index: i,
            selector: table.id ? '#' + table.id : 'table:nth-of-type(' + (i + 1) + ')',
            rows: table.rows?.length || 0,
            headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || ''),
            caption: table.querySelector('caption')?.textContent?.trim() || ''
          }));
        }

        function detectHeaders() {
          return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent?.trim() || ''
          }));
        }

        function detectLists() {
          return {
            ordered: document.querySelectorAll('ol').length,
            unordered: document.querySelectorAll('ul').length,
            items: document.querySelectorAll('li').length
          };
        }

        function detectImages() {
          const images = Array.from(document.querySelectorAll('img'));
          return {
            total: images.length,
            withAlt: images.filter(img => img.alt).length,
            withoutAlt: images.filter(img => !img.alt).length
          };
        }

        function detectButtons() {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]'));
          return buttons.map(btn => ({
            text: btn.textContent?.trim() || btn.value || '',
            type: btn.tagName.toLowerCase(),
            selector: btn.id ? '#' + btn.id : btn.className ? '.' + btn.className.split(' ')[0] : btn.tagName.toLowerCase()
          }));
        }

        function detectLinks() {
          const links = Array.from(document.querySelectorAll('a[href]'));
          return {
            total: links.length,
            internal: links.filter(a => a.href.startsWith(window.location.origin)).length,
            external: links.filter(a => !a.href.startsWith(window.location.origin)).length
          };
        }

        function detectInputs() {
          const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
          const byType = {};
          inputs.forEach(input => {
            const type = input.type || 'text';
            byType[type] = (byType[type] || 0) + 1;
          });
          return { total: inputs.length, byType };
        }

        const analysis = {
          url: window.location.href,
          title: document.title,
          forms: ${args.includeForms !== false} ? detectForms() : [],
          navigation: ${args.includeNavigation !== false} ? detectNavigation() : [],
          tables: ${args.includeTables !== false} ? detectTables() : [],
          headers: detectHeaders(),
          lists: detectLists(),
          images: detectImages(),
          buttons: detectButtons(),
          links: detectLinks(),
          inputs: detectInputs(),
          meta: {
            description: document.querySelector('meta[name="description"]')?.content || '',
            keywords: document.querySelector('meta[name="keywords"]')?.content || '',
            viewport: document.querySelector('meta[name="viewport"]')?.content || ''
          }
        };

        return analysis;
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async smartFillForm(args = {}) {
    this.ensureEnabled();

    const formData = args.formData;
    const formSelector = args.formSelector || 'form';
    const submitAfter = args.submitAfter || false;

    if (!formData || typeof formData !== 'object') {
      throw new Error('formData must be an object with field names/labels as keys');
    }

    const jsCode = `
      (function() {
        const formData = ${JSON.stringify(formData)};
        const formSelector = ${JSON.stringify(formSelector)};
        const submitAfter = ${submitAfter};
        
        const form = document.querySelector(formSelector);
        if (!form) return { error: 'Form not found: ' + formSelector };
        
        const fields = form.querySelectorAll('input, select, textarea');
        const results = [];
        let filledCount = 0;
        let notFound = [];
        
        fields.forEach(field => {
          const name = field.name?.toLowerCase() || '';
          const id = field.id?.toLowerCase() || '';
          const placeholder = field.placeholder?.toLowerCase() || '';
          const label = field.labels?.[0]?.textContent?.trim().toLowerCase() || 
                       field.getAttribute('aria-label')?.toLowerCase() || '';
          
          const fieldIdentifier = name || id || placeholder || label;
          
          let matchFound = false;
          let matchedKey = null;
          
          for (const [key, value] of Object.entries(formData)) {
            const searchKey = key.toLowerCase();
            
            if (fieldIdentifier.includes(searchKey) || 
                searchKey.includes(fieldIdentifier) ||
                label.includes(searchKey) ||
                name.includes(searchKey) ||
                id.includes(searchKey) ||
                placeholder.includes(searchKey)) {
              
              matchFound = true;
              matchedKey = key;
              
              if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = value === true || value === 'true' || value === 'yes' || value === 'on';
              } else if (field.tagName.toLowerCase() === 'select') {
                const options = Array.from(field.options);
                const option = options.find(opt => 
                  opt.value.toLowerCase() === value.toLowerCase() || 
                  opt.text.toLowerCase() === value.toLowerCase()
                );
                if (option) {
                  field.value = option.value;
                } else {
                  field.value = value;
                }
              } else {
                field.value = value;
              }
              
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              
              filledCount++;
              results.push({
                field: field.name || field.id || field.type,
                key: matchedKey,
                value: value,
                success: true
              });
              
              break;
            }
          }
          
          if (!matchFound) {
            notFound.push({
              field: field.name || field.id || field.type,
              label: field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '',
              type: field.type || 'text'
            });
          }
        });
        
        let submitted = false;
        if (submitAfter) {
          const submitBtn = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
          if (submitBtn) {
            submitBtn.click();
            submitted = true;
          }
        }
        
        return {
          form: formSelector,
          filledCount: filledCount,
          totalFields: fields.length,
          results: results,
          notFound: notFound,
          submitted: submitted
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async getFormAnalysis(args = {}) {
    this.ensureEnabled();

    const formSelector = args.formSelector || null;
    const includeSuggestions = args.includeSuggestions || false;

    const jsCode = `
      (function() {
        const formSelector = ${formSelector ? JSON.stringify(formSelector) : 'null'};
        const includeSuggestions = ${includeSuggestions};
        
        const forms = formSelector ? 
          Array.from(document.querySelectorAll(formSelector)) : 
          Array.from(document.querySelectorAll('form'));
        
        if (forms.length === 0) return { error: 'No forms found' };
        
        function getSuggestedValue(field) {
          const type = field.type || 'text';
          const name = (field.name || '').toLowerCase();
          const label = (field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '').toLowerCase();
          const placeholder = (field.placeholder || '').toLowerCase();
          
          const identifier = name + ' ' + label + ' ' + placeholder;
          
          if (type === 'email' || identifier.includes('email')) return 'user@example.com';
          if (type === 'password' || identifier.includes('password')) return '••••••••';
          if (type === 'tel' || identifier.includes('phone')) return '+1-555-0123';
          if (type === 'number' || identifier.includes('age')) return '25';
          if (type === 'url' || identifier.includes('website')) return 'https://example.com';
          if (type === 'date' || identifier.includes('date')) return '2024-01-01';
          if (type === 'checkbox') return 'true/false';
          if (type === 'radio') return 'option value';
          if (identifier.includes('name') && identifier.includes('first')) return 'John';
          if (identifier.includes('name') && identifier.includes('last')) return 'Doe';
          if (identifier.includes('name')) return 'John Doe';
          if (identifier.includes('address')) return '123 Main St';
          if (identifier.includes('city')) return 'New York';
          if (identifier.includes('zip') || identifier.includes('postal')) return '10001';
          if (identifier.includes('country')) return 'United States';
          if (identifier.includes('company')) return 'Acme Corp';
          if (identifier.includes('message') || identifier.includes('comment')) return 'Your message here';
          
          return '[value]';
        }
        
        function analyzeField(field) {
          return {
            tag: field.tagName.toLowerCase(),
            type: field.type || 'text',
            name: field.name || '',
            id: field.id || '',
            label: field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '',
            placeholder: field.placeholder || '',
            required: field.required || field.getAttribute('aria-required') === 'true',
            disabled: field.disabled,
            readonly: field.readOnly,
            autocomplete: field.autocomplete || '',
            pattern: field.pattern || null,
            minLength: field.minLength > 0 ? field.minLength : null,
            maxLength: field.maxLength > 0 ? field.maxLength : null,
            min: field.min || null,
            max: field.max || null,
            suggestedValue: includeSuggestions ? getSuggestedValue(field) : null
          };
        }
        
        const analyzedForms = forms.map((form, index) => ({
          index: index,
          selector: form.id ? '#' + form.id : 'form:nth-of-type(' + (index + 1) + ')',
          action: form.action || '',
          method: form.method || 'get',
          enctype: form.enctype || '',
          fields: Array.from(form.querySelectorAll('input, select, textarea')).map(analyzeField),
          submitButton: form.querySelector('input[type="submit"], button[type="submit"], button:not([type])') ? {
            tag: 'button',
            text: form.querySelector('input[type="submit"], button[type="submit"], button:not([type])')?.textContent?.trim() || 'Submit'
          } : null
        }));
        
        return {
          totalForms: analyzedForms.length,
          forms: analyzedForms
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async clickByOverlayId(args = {}) {
    this.ensureEnabled();

    const overlayId = args.overlayId;
    
    if (!overlayId || !this.overlayMap.has(overlayId)) {
      throw new Error(`Overlay ID ${overlayId} not found. Call get_visual_map first to generate overlays.`);
    }

    const element = this.overlayMap.get(overlayId);
    
    return await this.unifiedBackend.callTool('browser_interact', {
      actions: [{ type: 'click', selector: element.selector }]
    });
  }

  async hoverByOverlayId(args = {}) {
    this.ensureEnabled();

    const overlayId = args.overlayId;
    
    if (!overlayId || !this.overlayMap.has(overlayId)) {
      throw new Error(`Overlay ID ${overlayId} not found. Call get_visual_map first to generate overlays.`);
    }

    const element = this.overlayMap.get(overlayId);
    
    return await this.unifiedBackend.callTool('browser_interact', {
      actions: [{ type: 'hover', selector: element.selector }]
    });
  }

  async detectPopups(args = {}) {
    this.ensureEnabled();

    const autoClose = args.autoClose || false;
    const types = args.types || ['cookie_banner', 'modal', 'popup', 'notification', 'overlay', 'consent'];

    const jsCode = `
      (function() {
        const autoClose = ${autoClose};
        const types = ${JSON.stringify(types)};
        
        const detectedPopups = [];
        
        function detectCookieBanners() {
          const selectors = [
            '#onetrust-banner-sdk', '.cookie-banner', '.cookie-notice', '.cookie-consent',
            '.cookie-policy', '#cookie-banner', '.cc-banner', '.eu-cookie',
            '[class*="cookie"]', '[id*="cookie"]', '[class*="consent"]', '[id*="consent"]',
            '[class*="gdpr"]', '[id*="gdpr"]'
          ];
          
          const banners = [];
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 100 && rect.height > 50 && rect.top < window.innerHeight) {
                  const isVisible = window.getComputedStyle(el).display !== 'none';
                  if (isVisible) {
                    banners.push({
                      type: 'cookie_banner',
                      selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
                      text: el.textContent?.trim().substring(0, 100) || '',
                      position: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
                      buttons: Array.from(el.querySelectorAll('button, a')).map(btn => ({
                        text: btn.textContent?.trim() || '',
                        selector: btn.id ? '#' + btn.id : btn.tagName.toLowerCase()
                      }))
                    });
                  }
                }
              });
            } catch(e) {}
          });
          
          return banners;
        }
        
        function detectModals() {
          const selectors = [
            '[role="dialog"]', '[role="alertdialog"]', '.modal', '.popup', '.overlay',
            '.dialog', '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]',
            '.MuiDialog-root', '.ant-modal', '.el-dialog', '.v-dialog'
          ];
          
          const modals = [];
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 200 && rect.height > 100) {
                  const isVisible = window.getComputedStyle(el).display !== 'none';
                  if (isVisible) {
                    modals.push({
                      type: 'modal',
                      selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
                      title: el.querySelector('h1, h2, h3, .modal-title, [class*="title"]')?.textContent?.trim() || '',
                      text: el.textContent?.trim().substring(0, 200) || '',
                      position: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
                      closeButton: el.querySelector('[class*="close"], [class*="dismiss"], [aria-label*="close"], [aria-label*="dismiss"], button.close') ? true : false
                    });
                  }
                }
              });
            } catch(e) {}
          });
          
          return modals;
        }
        
        function detectNotifications() {
          const selectors = [
            '[role="alert"]', '.notification', '.toast', '.alert', '.snackbar',
            '[class*="notification"]', '[class*="toast"]', '[class*="alert"]',
            '.MuiSnackbar-root', '.ant-notification', '.el-notification'
          ];
          
          const notifications = [];
          selectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 20) {
                  const isVisible = window.getComputedStyle(el).display !== 'none';
                  if (isVisible) {
                    notifications.push({
                      type: 'notification',
                      selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
                      text: el.textContent?.trim().substring(0, 100) || '',
                      position: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
                    });
                  }
                }
              });
            } catch(e) {}
          });
          
          return notifications;
        }
        
        function detectOverlays() {
          const overlays = [];
          const elements = document.querySelectorAll('div');
          
          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && 
                (style.zIndex > 1000 || parseInt(style.zIndex) > 1000) &&
                style.display !== 'none' &&
                style.visibility !== 'hidden') {
              
              const rect = el.getBoundingClientRect();
              if (rect.width === window.innerWidth && rect.height === window.innerHeight) {
                overlays.push({
                  type: 'overlay',
                  selector: el.id ? '#' + el.id : 'div[style*="z-index"]',
                  position: { x: 0, y: 0, width: Math.round(rect.width), height: Math.round(rect.height) },
                  zIndex: style.zIndex
                });
              }
            }
          });
          
          return overlays;
        }
        
        const results = {
          cookieBanners: types.includes('cookie_banner') ? detectCookieBanners() : [],
          modals: types.includes('modal') ? detectModals() : [],
          notifications: types.includes('notification') ? detectNotifications() : [],
          overlays: types.includes('overlay') ? detectOverlays() : [],
          totalPopups: 0
        };
        
        results.totalPopups = results.cookieBanners.length + results.modals.length + 
                             results.notifications.length + results.overlays.length;
        
        if (autoClose) {
          const closeActions = [];
          
          results.cookieBanners.forEach(banner => {
            const acceptBtn = banner.buttons.find(btn => 
              btn.text.toLowerCase().includes('accept') || 
              btn.text.toLowerCase().includes('allow') ||
              btn.text.toLowerCase().includes('agree')
            );
            if (acceptBtn) {
              closeActions.push({ action: 'click', selector: acceptBtn.selector, type: 'cookie_banner' });
            }
          });
          
          results.modals.forEach(modal => {
            if (modal.closeButton) {
              closeActions.push({ action: 'click', selector: modal.selector + ' [class*="close"], ' + modal.selector + ' [aria-label*="close"]', type: 'modal' });
            }
          });
          
          results.closeActions = closeActions;
        }
        
        return results;
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async detectAds(args = {}) {
    this.ensureEnabled();

    const includePositions = args.includePositions || false;
    const blockAds = args.blockAds || false;

    const jsCode = `
      (function() {
        const includePositions = ${includePositions};
        const blockAds = ${blockAds};
        
        const adSelectors = [
          '[class*="ad-"]', '[class*="-ad"]', '[class*="ads-"]', '[class*="-ads"]',
          '[id*="ad-"]', '[id*="-ad"]', '[id*="ads-"]', '[id*="-ads"]',
          '[class*="banner-ad"]', '[class*="ad-banner"]', '[class*="sponsored"]',
          '[class*="advertisement"]', '[class*="ad-container"]', '[class*="ad-wrapper"]',
          '.adsbygoogle', '.ad-slot', '.ad-unit', '.ad-block', '.ad-content',
          '.google-ads', '.dfp-ad', '.taboola', '.outbrain', '.advertising',
          '[data-ad-slot]', '[data-ad-client]', '[data-ad-channel]', '[data-ad-format]',
          'ins.adsbygoogle', 'amp-ad', 'amp-embed'
        ];
        
        const ads = [];
        const seenElements = new Set();
        
        adSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (!seenElements.has(el)) {
                seenElements.add(el);
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                if (rect.width > 10 && rect.height > 10 && style.display !== 'none') {
                  ads.push({
                    selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
                    type: 'ad',
                    adNetwork: detectAdNetwork(el),
                    position: includePositions ? {
                      x: Math.round(rect.left),
                      y: Math.round(rect.top),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height)
                    } : null,
                    size: rect.width + 'x' + rect.height
                  });
                }
              }
            });
          } catch(e) {}
        });
        
        function detectAdNetwork(el) {
          if (el.classList.contains('adsbygoogle')) return 'Google Ads';
          if (el.querySelector('[data-ad-client]')) return 'Google Ads';
          if (el.classList.contains('taboola')) return 'Taboola';
          if (el.classList.contains('outbrain')) return 'Outbrain';
          if (el.classList.contains('dfp-ad')) return 'Google DFP';
          if (el.getAttribute('data-ad-slot')) return 'Google Ads';
          return 'Unknown';
        }
        
        if (blockAds) {
          ads.forEach(ad => {
            try {
              const el = document.querySelector(ad.selector);
              if (el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
              }
            } catch(e) {}
          });
        }
        
        return {
          totalAds: ads.length,
          ads: ads,
          blocked: blockAds
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async manageCookies(args = {}) {
    this.ensureEnabled();

    const action = args.action;
    const domain = args.domain || null;
    const name = args.name || null;
    const cookies = args.cookies || null;

    const jsCode = `
      (function() {
        const action = ${JSON.stringify(action)};
        const domain = ${domain ? JSON.stringify(domain) : 'null'};
        const name = ${name ? JSON.stringify(name) : 'null'};
        const cookies = ${cookies ? JSON.stringify(cookies) : 'null'};
        
        function getAllCookies() {
          return document.cookie.split(';').map(c => {
            const [key, ...valueParts] = c.trim().split('=');
            return { name: key.trim(), value: valueParts.join('=').trim() };
          }).filter(c => c.name);
        }
        
        if (action === 'get') {
          let cookies = getAllCookies();
          if (name) {
            cookies = cookies.filter(c => c.name === name);
          }
          return { action: 'get', cookies: cookies, count: cookies.length };
        }
        
        if (action === 'set') {
          if (!cookies || !Array.isArray(cookies)) {
            return { error: 'cookies array is required for set action' };
          }
          
          const results = [];
          cookies.forEach(cookie => {
            const cookieStr = \`\${cookie.name}=\${cookie.value}; path=\${cookie.path || '/'}; domain=\${cookie.domain || window.location.hostname}; max-age=\${cookie.maxAge || 31536000}; samesite=\${cookie.sameSite || 'Lax'}\`;
            document.cookie = cookieStr;
            results.push({ name: cookie.name, success: true });
          });
          
          return { action: 'set', results: results, count: results.length };
        }
        
        if (action === 'delete') {
          if (!name) {
            return { error: 'cookie name is required for delete action' };
          }
          
          document.cookie = \`\${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT\`;
          return { action: 'delete', name: name, success: true };
        }
        
        if (action === 'clear') {
          const cookies = getAllCookies();
          cookies.forEach(cookie => {
            document.cookie = \`\${cookie.name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT\`;
          });
          return { action: 'clear', deleted: cookies.length, success: true };
        }
        
        return { error: 'Unknown action: ' + action };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async manageStorage(args = {}) {
    this.ensureEnabled();

    const action = args.action;
    const type = args.type;
    const key = args.key || null;
    const value = args.value || null;

    const jsCode = `
      (function() {
        const action = ${JSON.stringify(action)};
        const type = ${JSON.stringify(type)};
        const key = ${key ? JSON.stringify(key) : 'null'};
        const value = ${value ? JSON.stringify(value) : 'null'};
        
        const storage = type === 'local' ? localStorage : sessionStorage;
        
        if (action === 'get') {
          if (key) {
            const val = storage.getItem(key);
            return { action: 'get', type: type, key: key, value: val };
          } else {
            const all = {};
            for (let i = 0; i < storage.length; i++) {
              const k = storage.key(i);
              all[k] = storage.getItem(k);
            }
            return { action: 'get', type: type, all: all, count: storage.length };
          }
        }
        
        if (action === 'set') {
          if (!key || value === null) {
            return { error: 'key and value are required for set action' };
          }
          storage.setItem(key, value);
          return { action: 'set', type: type, key: key, success: true };
        }
        
        if (action === 'delete') {
          if (!key) {
            return { error: 'key is required for delete action' };
          }
          storage.removeItem(key);
          return { action: 'delete', type: type, key: key, success: true };
        }
        
        if (action === 'clear') {
          storage.clear();
          return { action: 'clear', type: type, success: true };
        }
        
        return { error: 'Unknown action: ' + action };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async waitFor(args = {}) {
    this.ensureEnabled();

    const selector = args.selector || null;
    const text = args.text || null;
    const condition = args.condition || null;
    const timeout = args.timeout || 10000;
    const visible = args.visible || false;

    const jsCode = `
      (function() {
        const selector = ${selector ? JSON.stringify(selector) : 'null'};
        const text = ${text ? JSON.stringify(text) : 'null'};
        const condition = ${condition ? JSON.stringify(condition) : 'null'};
        const timeout = ${timeout};
        const visible = ${visible};
        
        return new Promise((resolve) => {
          const startTime = Date.now();
          
          function check() {
            if (Date.now() - startTime > timeout) {
              resolve({ success: false, error: 'Timeout after ' + timeout + 'ms' });
              return;
            }
            
            if (selector) {
              const el = document.querySelector(selector);
              if (el) {
                if (visible) {
                  const rect = el.getBoundingClientRect();
                  const style = window.getComputedStyle(el);
                  if (rect.width > 0 && rect.height > 0 && style.display !== 'none') {
                    resolve({ success: true, element: selector, visible: true });
                    return;
                  }
                } else {
                  resolve({ success: true, element: selector, visible: false });
                  return;
                }
              }
            }
            
            if (text) {
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
              let node;
              while (node = walker.nextNode()) {
                if (node.textContent.includes(text)) {
                  resolve({ success: true, text: text, found: true });
                  return;
                }
              }
            }
            
            if (condition) {
              try {
                const result = eval(condition);
                if (result) {
                  resolve({ success: true, condition: condition, result: result });
                  return;
                }
              } catch(e) {}
            }
            
            setTimeout(check, 100);
          }
          
          check();
        });
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async selfHealSelector(args = {}) {
    this.ensureEnabled();

    const failedSelector = args.failedSelector;
    const textHint = args.textHint || null;
    const roleHint = args.roleHint || null;

    if (!failedSelector) {
      throw new Error('failedSelector is required');
    }

    const jsCode = `
      (function() {
        const failedSelector = ${JSON.stringify(failedSelector)};
        const textHint = ${textHint ? JSON.stringify(textHint) : 'null'};
        const roleHint = ${roleHint ? JSON.stringify(roleHint) : 'null'};
        
        function getSimilarElements(hint, type) {
          let candidates = [];
          
          if (type === 'button' || roleHint === 'button') {
            candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]'));
          } else if (type === 'link' || roleHint === 'link') {
            candidates = Array.from(document.querySelectorAll('a, [role="link"]'));
          } else if (type === 'input' || roleHint === 'textbox') {
            candidates = Array.from(document.querySelectorAll('input, textarea, [role="textbox"]'));
          } else {
            candidates = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="link"], [role="textbox"]'));
          }
          
          if (hint) {
            const lowerHint = hint.toLowerCase();
            return candidates.filter(el => {
              const text = el.textContent?.toLowerCase() || '';
              const label = el.getAttribute('aria-label')?.toLowerCase() || '';
              const name = el.getAttribute('name')?.toLowerCase() || '';
              const placeholder = el.getAttribute('placeholder')?.toLowerCase() || '';
              
              return text.includes(lowerHint) || 
                     label.includes(lowerHint) || 
                     name.includes(lowerHint) || 
                     placeholder.includes(lowerHint);
            }).map(el => ({
              selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
              text: el.textContent?.trim().substring(0, 50) || '',
              tag: el.tagName.toLowerCase(),
              matchReason: 'text match'
            }));
          }
          
          return candidates.slice(0, 5).map(el => ({
            selector: el.id ? '#' + el.id : '.' + el.className.split(' ')[0],
            text: el.textContent?.trim().substring(0, 50) || '',
            tag: el.tagName.toLowerCase(),
            matchReason: 'type match'
          }));
        }
        
        const suggestions = getSimilarElements(textHint, roleHint);
        
        return {
          failedSelector: failedSelector,
          suggestions: suggestions,
          count: suggestions.length,
          message: suggestions.length > 0 ? 
            'Found ' + suggestions.length + ' similar elements. Try one of these selectors.' :
            'No similar elements found. Try a different approach.'
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async getAccessibilityTree(args = {}) {
    this.ensureEnabled();

    const maxDepth = args.maxDepth || 10;
    const includeHidden = args.includeHidden || false;
    const filterRole = args.filterRole || null;

    const jsCode = `
      (function() {
        const maxDepth = ${maxDepth};
        const includeHidden = ${includeHidden};
        const filterRole = ${filterRole ? JSON.stringify(filterRole) : 'null'};
        
        function buildAccessibilityTree(node, depth) {
          if (depth > maxDepth) return null;
          if (node.nodeType !== Node.ELEMENT_NODE) return null;
          
          const style = window.getComputedStyle(node);
          if (!includeHidden && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            return null;
          }
          
          const role = node.getAttribute('role') || 
                      node.tagName.toLowerCase() || 
                      'generic';
          
          if (filterRole && role !== filterRole) {
            const children = Array.from(node.children)
              .map(child => buildAccessibilityTree(child, depth + 1))
              .filter(Boolean);
            return children.length > 0 ? { children } : null;
          }
          
          const name = node.getAttribute('aria-label') || 
                      node.getAttribute('title') ||
                      node.getAttribute('alt') ||
                      node.getAttribute('placeholder') ||
                      node.getAttribute('name') ||
                      node.textContent?.trim().substring(0, 100) ||
                      '';
          
          const treeNode = {
            role: role,
            name: name,
            tag: node.tagName.toLowerCase()
          };
          
          if (node.id) treeNode.id = node.id;
          if (node.getAttribute('aria-required') === 'true') treeNode.required = true;
          if (node.getAttribute('aria-disabled') === 'true') treeNode.disabled = true;
          if (node.getAttribute('aria-expanded')) treeNode.expanded = node.getAttribute('aria-expanded') === 'true';
          if (node.getAttribute('aria-checked')) treeNode.checked = node.getAttribute('aria-checked') === 'true';
          if (node.getAttribute('aria-selected')) treeNode.selected = node.getAttribute('aria-selected') === 'true';
          if (node.getAttribute('aria-level')) treeNode.level = parseInt(node.getAttribute('aria-level'));
          if (node.getAttribute('aria-describedby')) treeNode.describedBy = node.getAttribute('aria-describedby');
          if (node.getAttribute('aria-live')) treeNode.live = node.getAttribute('aria-live');
          
          const children = Array.from(node.children)
            .map(child => buildAccessibilityTree(child, depth + 1))
            .filter(Boolean);
          
          if (children.length > 0) {
            treeNode.children = children;
          }
          
          return treeNode;
        }
        
        const tree = buildAccessibilityTree(document.body, 0);
        
        function countNodes(node) {
          if (!node) return 0;
          let count = 1;
          if (node.children) {
            node.children.forEach(child => {
              count += countNodes(child);
            });
          }
          return count;
        }
        
        return {
          tree: tree,
          totalNodes: countNodes(tree)
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async detectCaptcha() {
    this.ensureEnabled();

    const jsCode = `
      (function() {
        const captchaSelectors = [
          '.g-recaptcha', '.recaptcha', '[data-sitekey]', '.h-captcha',
          '.captcha', '#captcha', '.cf-challenge', '[class*="captcha"]',
          '[class*="recaptcha"]', '[class*="turnstile"]', '[class*="bot-check"]',
          '[class*="human-verification"]', '[class*="verify-you-are-human"]',
          '#cf-challenge-running', '.challenge-runner', '.captcha-container',
          'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
          'iframe[src*="turnstile"]', 'iframe[src*="captcha"]'
        ];
        
        const detected = [];
        
        captchaSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                detected.push({
                  selector: selector,
                  type: detectCaptchaType(el),
                  visible: true,
                  position: { x: Math.round(rect.left), y: Math.round(rect.top) }
                });
              }
            });
          } catch(e) {}
        });
        
        function detectCaptchaType(el) {
          if (el.classList.contains('g-recaptcha')) return 'reCAPTCHA v2';
          if (el.getAttribute('data-sitekey')?.startsWith('6L')) return 'reCAPTCHA';
          if (el.classList.contains('h-captcha')) return 'hCaptcha';
          if (el.classList.contains('cf-challenge')) return 'Cloudflare Challenge';
          if (el.getAttribute('data-sitekey')?.includes('turnstile')) return 'Cloudflare Turnstile';
          if (el.src?.includes('recaptcha')) return 'reCAPTCHA iframe';
          if (el.src?.includes('hcaptcha')) return 'hCaptcha iframe';
          return 'Unknown CAPTCHA';
        }
        
        return {
          captchaDetected: detected.length > 0,
          count: detected.length,
          captchas: detected,
          message: detected.length > 0 ? 
            'CAPTCHA detected. Manual intervention required.' :
            'No CAPTCHA detected on this page.'
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async detectLoginForm() {
    this.ensureEnabled();

    const jsCode = `
      (function() {
        function detectLoginForms() {
          const forms = Array.from(document.querySelectorAll('form'));
          const loginForms = [];
          
          forms.forEach((form, index) => {
            const fields = Array.from(form.querySelectorAll('input'));
            const hasPassword = fields.some(f => f.type === 'password');
            const hasEmail = fields.some(f => f.type === 'email' || f.name?.includes('email'));
            const hasUsername = fields.some(f => f.name?.includes('user') || f.name?.includes('login'));
            const hasSubmit = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
            
            const formText = form.textContent?.toLowerCase() || '';
            const isLoginForm = formText.includes('login') || formText.includes('sign in') || 
                               formText.includes('log in') || formText.includes('password');
            
            if ((hasPassword && (hasEmail || hasUsername)) || isLoginForm) {
              loginForms.push({
                index: index,
                selector: form.id ? '#' + form.id : 'form:nth-of-type(' + (index + 1) + ')',
                action: form.action || '',
                method: form.method || 'post',
                fields: fields.map(field => ({
                  type: field.type || 'text',
                  name: field.name || '',
                  id: field.id || '',
                  placeholder: field.placeholder || '',
                  label: field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '',
                  autocomplete: field.autocomplete || '',
                  selector: field.id ? '#' + field.id : 'input[name="' + field.name + '"]'
                })),
                submitButton: hasSubmit ? {
                  text: hasSubmit.textContent?.trim() || hasSubmit.value || 'Submit',
                  selector: hasSubmit.id ? '#' + hasSubmit.id : 'button'
                } : null,
                isLikelyLogin: hasPassword && (hasEmail || hasUsername)
              });
            }
          });
          
          return loginForms;
        }
        
        const loginForms = detectLoginForms();
        
        return {
          loginFormsDetected: loginForms.length > 0,
          count: loginForms.length,
          forms: loginForms,
          message: loginForms.length > 0 ? 
            'Found ' + loginForms.length + ' potential login form(s). Use smart_fill_form to fill credentials.' :
            'No login forms detected on this page.'
        };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async scrollPage(args = {}) {
    this.ensureEnabled();

    const action = args.action;
    const selector = args.selector || null;
    const x = args.x || 0;
    const y = args.y || 0;
    const loadAll = args.loadAll || false;

    const jsCode = `
      (function() {
        const action = ${JSON.stringify(action)};
        const selector = ${selector ? JSON.stringify(selector) : 'null'};
        const x = ${x};
        const y = ${y};
        const loadAll = ${loadAll};
        
        if (action === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return { action: 'scroll_top', success: true };
        }
        
        if (action === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          return { action: 'scroll_bottom', success: true, scrollHeight: document.body.scrollHeight };
        }
        
        if (action === 'element') {
          if (!selector) return { error: 'selector is required for element scroll' };
          const el = document.querySelector(selector);
          if (!el) return { error: 'Element not found: ' + selector };
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { action: 'scroll_to_element', selector: selector, success: true };
        }
        
        if (action === 'coordinates') {
          window.scrollTo({ top: y, left: x, behavior: 'smooth' });
          return { action: 'scroll_to_coordinates', x: x, y: y, success: true };
        }
        
        if (action === 'lazy_load') {
          let previousHeight = 0;
          let attempts = 0;
          const maxAttempts = 20;
          
          while (previousHeight !== document.body.scrollHeight && attempts < maxAttempts) {
            previousHeight = document.body.scrollHeight;
            window.scrollTo(0, document.body.scrollHeight);
            
            const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]');
            lazyImages.forEach(img => {
              if (img.dataset.src) img.src = img.dataset.src;
              if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
              if (img.dataset.original) img.src = img.dataset.original;
            });
            
            const lazyElements = document.querySelectorAll('[data-src], [data-lazy-src], [data-original]');
            lazyElements.forEach(el => {
              if (el.dataset.src) el.src = el.dataset.src;
              if (el.dataset.lazySrc) el.src = el.dataset.lazySrc;
              if (el.dataset.original) el.src = el.dataset.original;
            });
            
            const lazyFrames = document.querySelectorAll('iframe[data-src]');
            lazyFrames.forEach(frame => {
              if (frame.dataset.src) frame.src = frame.dataset.src;
            });
            
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const target = entry.target;
                  if (target.dataset.src) target.src = target.dataset.src;
                  if (target.dataset.lazySrc) target.src = target.dataset.lazySrc;
                  if (target.dataset.original) target.src = target.dataset.original;
                  observer.unobserve(target);
                }
              });
            });
            
            document.querySelectorAll('img, video, iframe').forEach(el => observer.observe(el));
            
            for (let i = 0; i < 500; i++) {}
            attempts++;
          }
          
          return { 
            action: 'lazy_load_all', 
            success: true, 
            scrollHeight: document.body.scrollHeight,
            attempts: attempts
          };
        }
        
        return { error: 'Unknown scroll action: ' + action };
      })();
    `;

    return await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
  }

  async comparePages(args = {}) {
    this.ensureEnabled();

    const previousPath = args.previousPath || null;
    const previousUrl = args.previousUrl || null;
    const outputPath = args.outputPath || null;
    const highlightChanges = args.highlightChanges || false;

    if (!previousPath && !previousUrl) {
      throw new Error('Either previousPath or previousUrl must be provided');
    }

    const jsCode = `
      (function() {
        const highlightChanges = ${highlightChanges};
        
        const currentPage = {
          url: window.location.href,
          title: document.title,
          textContent: document.body?.textContent?.trim().substring(0, 5000) || '',
          elementCount: document.querySelectorAll('*').length,
          imageCount: document.querySelectorAll('img').length,
          linkCount: document.querySelectorAll('a').length
        };
        
        return currentPage;
      })();
    `;

    const currentPage = await this.unifiedBackend.callTool('browser_evaluate', { function: jsCode });
    
    return {
      status: 'page_comparison',
      currentPage: currentPage,
      message: 'Page state captured. Compare with previous state manually or use visual diff tools.',
      note: 'Full visual diff requires external image comparison library'
    };
  }

  ensureEnabled() {
    if (!this.enabled) {
      throw new Error('Browser automation not enabled. Call enable first.');
    }
  }
}

module.exports = { StatefulBackend };
