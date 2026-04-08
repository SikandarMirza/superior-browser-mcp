// Superior Browser MCP - Content Script
// Injected into all pages to provide enhanced element detection and interaction

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__superiorMCPInjected) return;
  window.__superiorMCPInjected = true;

  // Overlay system
  const OverlaySystem = {
    overlays: new Map(),
    counter: 0,

    show(element, id = null) {
      const overlayId = id || ++this.counter;
      const rect = element.getBoundingClientRect();
      
      const overlay = document.createElement('div');
      overlay.className = 'superior-mcp-overlay';
      overlay.dataset.overlayId = overlayId;
      overlay.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #ff3366;
        background: rgba(255, 51, 102, 0.1);
        pointer-events: none;
        z-index: 2147483647;
        box-sizing: border-box;
      `;

      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -10px;
        left: -10px;
        background: #ff3366;
        color: white;
        font-size: 11px;
        font-weight: bold;
        font-family: monospace;
        padding: 2px 6px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      badge.textContent = overlayId;
      overlay.appendChild(badge);

      document.body.appendChild(overlay);
      this.overlays.set(overlayId, { element, overlay });
      
      return overlayId;
    },

    hide(overlayId) {
      if (this.overlays.has(overlayId)) {
        const { overlay } = this.overlays.get(overlayId);
        overlay.remove();
        this.overlays.delete(overlayId);
      }
    },

    hideAll() {
      this.overlays.forEach(({ overlay }) => overlay.remove());
      this.overlays.clear();
    },

    highlight(selector, color = '#00ff88') {
      const element = document.querySelector(selector);
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'superior-mcp-highlight';
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 3px solid ${color};
        background: rgba(0, 255, 136, 0.15);
        pointer-events: none;
        z-index: 2147483647;
        box-sizing: border-box;
        animation: superior-mcp-pulse 1s ease-in-out;
      `;

      document.body.appendChild(highlight);
      setTimeout(() => highlight.remove(), 2000);
      return true;
    }
  };

  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes superior-mcp-pulse {
      0% { opacity: 0; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1); }
      100% { opacity: 0.8; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Element classifier
  const ElementClassifier = {
    classify(element) {
      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute('role') || '';
      const className = element.className || '';
      const id = element.id || '';
      const classes = typeof className === 'string' ? className.split(' ') : [];
      
      const classification = {
        tag: tag,
        role: role,
        type: this.getElementType(element),
        category: this.getCategory(element),
        isInteractive: this.isInteractive(element),
        isFormElement: this.isFormElement(element),
        isNavigation: this.isNavigation(element),
        isAd: this.isAd(element),
        isPopup: this.isPopup(element),
        isModal: this.isModal(element),
        isCookieBanner: this.isCookieBanner(element),
        isLoginField: this.isLoginField(element),
        accessibility: this.getAccessibilityInfo(element)
      };

      return classification;
    },

    getElementType(element) {
      const tag = element.tagName.toLowerCase();
      const type = element.type || '';
      const role = element.getAttribute('role') || '';

      if (tag === 'input') {
        switch (type) {
          case 'text':
          case 'email':
          case 'password':
          case 'tel':
          case 'url':
          case 'number':
          case 'search':
          case 'date':
          case 'time':
          case 'datetime-local':
          case 'month':
          case 'week':
            return 'input-' + type;
          case 'checkbox':
            return 'checkbox';
          case 'radio':
            return 'radio';
          case 'submit':
          case 'button':
          case 'reset':
            return 'button';
          case 'file':
            return 'file-input';
          case 'hidden':
            return 'hidden-input';
          default:
            return 'input';
        }
      }

      if (tag === 'button') return 'button';
      if (tag === 'select') return 'dropdown';
      if (tag === 'textarea') return 'textarea';
      if (tag === 'a') return 'link';
      if (tag === 'img') return 'image';
      if (tag === 'video') return 'video';
      if (tag === 'audio') return 'audio';
      if (tag === 'iframe') return 'iframe';
      if (tag === 'canvas') return 'canvas';
      if (tag === 'svg') return 'svg';
      if (tag === 'form') return 'form';
      if (tag === 'table') return 'table';
      if (tag === 'ul' || tag === 'ol') return 'list';
      if (tag === 'nav') return 'navigation';
      if (tag === 'header') return 'header';
      if (tag === 'footer') return 'footer';
      if (tag === 'main') return 'main-content';
      if (tag === 'aside') return 'sidebar';
      if (tag === 'section') return 'section';
      if (tag === 'article') return 'article';

      if (role) {
        return 'role-' + role;
      }

      return 'element';
    },

    getCategory(element) {
      const className = (element.className || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const identifier = className + ' ' + id;

      if (identifier.includes('nav') || identifier.includes('menu')) return 'navigation';
      if (identifier.includes('header')) return 'header';
      if (identifier.includes('footer')) return 'footer';
      if (identifier.includes('sidebar') || identifier.includes('aside')) return 'sidebar';
      if (identifier.includes('main') || identifier.includes('content')) return 'main-content';
      if (identifier.includes('ad') || identifier.includes('banner')) return 'advertisement';
      if (identifier.includes('cookie') || identifier.includes('consent') || identifier.includes('gdpr')) return 'cookie-banner';
      if (identifier.includes('modal') || identifier.includes('popup') || identifier.includes('dialog') || identifier.includes('overlay')) return 'popup';
      if (identifier.includes('login') || identifier.includes('signin') || identifier.includes('sign-in')) return 'login';
      if (identifier.includes('form')) return 'form';
      if (identifier.includes('button') || identifier.includes('btn')) return 'button-group';
      if (identifier.includes('search')) return 'search';
      if (identifier.includes('breadcrumb')) return 'breadcrumb';
      if (identifier.includes('pagination')) return 'pagination';
      if (identifier.includes('carousel') || identifier.includes('slider')) return 'carousel';
      if (identifier.includes('tab')) return 'tabs';
      if (identifier.includes('accordion')) return 'accordion';
      if (identifier.includes('tooltip')) return 'tooltip';
      if (identifier.includes('notification') || identifier.includes('toast') || identifier.includes('alert')) return 'notification';
      if (identifier.includes('table')) return 'table';
      if (identifier.includes('grid')) return 'grid';
      if (identifier.includes('card')) return 'card';
      if (identifier.includes('list')) return 'list';

      return 'unknown';
    },

    isInteractive(element) {
      const tag = element.tagName.toLowerCase();
      const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
      
      if (interactiveTags.includes(tag)) return true;
      if (element.getAttribute('role') && ['button', 'link', 'tab', 'menuitem', 'switch', 'checkbox', 'radio', 'slider', 'textbox'].includes(element.getAttribute('role'))) return true;
      if (element.hasAttribute('onclick') || element.hasAttribute('data-action') || element.getAttribute('tabindex') === '0') return true;
      if (element.getAttribute('contenteditable') === 'true') return true;

      return false;
    },

    isFormElement(element) {
      const tag = element.tagName.toLowerCase();
      return ['input', 'select', 'textarea', 'button'].includes(tag);
    },

    isNavigation(element) {
      const tag = element.tagName.toLowerCase();
      if (tag === 'nav') return true;
      if (element.getAttribute('role') === 'navigation') return true;
      
      const className = (element.className || '').toLowerCase();
      return className.includes('nav') || className.includes('menu');
    },

    isAd(element) {
      const className = (element.className || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const identifier = className + ' ' + id;

      const adPatterns = [
        'ad-', '-ad', 'ads-', '-ads', 'banner-ad', 'ad-banner',
        'sponsored', 'advertisement', 'ad-container', 'ad-wrapper',
        'adsbygoogle', 'ad-slot', 'ad-unit', 'ad-block', 'ad-content',
        'google-ads', 'dfp-ad', 'taboola', 'outbrain', 'advertising'
      ];

      return adPatterns.some(pattern => identifier.includes(pattern));
    },

    isPopup(element) {
      const style = window.getComputedStyle(element);
      if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 100) {
          return true;
        }
      }

      const className = (element.className || '').toLowerCase();
      const role = element.getAttribute('role') || '';
      return role === 'dialog' || role === 'alertdialog' || 
             className.includes('modal') || className.includes('popup') || 
             className.includes('overlay');
    },

    isModal(element) {
      const role = element.getAttribute('role') || '';
      if (role === 'dialog' || role === 'alertdialog') return true;

      const className = (element.className || '').toLowerCase();
      return className.includes('modal') || className.includes('dialog');
    },

    isCookieBanner(element) {
      const className = (element.className || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const text = element.textContent?.toLowerCase() || '';
      const identifier = className + ' ' + id + ' ' + text;

      const cookiePatterns = [
        'cookie', 'consent', 'gdpr', 'privacy', 'accept cookies',
        'we use cookies', 'cookie policy', 'accept all', 'reject all'
      ];

      return cookiePatterns.some(pattern => identifier.includes(pattern));
    },

    isLoginField(element) {
      if (!this.isFormElement(element)) return false;

      const name = (element.name || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const placeholder = (element.placeholder || '').toLowerCase();
      const type = element.type || '';
      const identifier = name + ' ' + id + ' ' + placeholder;

      const loginPatterns = [
        'username', 'user', 'login', 'email', 'password', 'pass',
        'signin', 'sign-in', 'log-in', 'log in'
      ];

      return loginPatterns.some(pattern => identifier.includes(pattern)) || 
             type === 'password';
    },

    getAccessibilityInfo(element) {
      return {
        role: element.getAttribute('role') || element.tagName.toLowerCase(),
        label: element.getAttribute('aria-label') || 
               element.getAttribute('aria-labelledby') ||
               element.getAttribute('title') ||
               element.getAttribute('alt') ||
               element.getAttribute('placeholder') ||
               element.getAttribute('name') ||
               element.textContent?.trim().substring(0, 100) ||
               '',
        describedBy: element.getAttribute('aria-describedby') || '',
        expanded: element.getAttribute('aria-expanded'),
        checked: element.getAttribute('aria-checked'),
        selected: element.getAttribute('aria-selected'),
        disabled: element.getAttribute('aria-disabled') === 'true' || element.disabled,
        required: element.getAttribute('aria-required') === 'true' || element.required,
        invalid: element.getAttribute('aria-invalid'),
        live: element.getAttribute('aria-live'),
        tabIndex: element.tabIndex
      };
    }
  };

  // Form analyzer
  const FormAnalyzer = {
    analyze(form) {
      if (!form) {
        form = document.querySelector('form');
      }

      if (!form) return { error: 'No form found' };

      const fields = Array.from(form.querySelectorAll('input, select, textarea'));
      
      return {
        selector: form.id ? '#' + form.id : 'form',
        action: form.action || '',
        method: form.method || 'get',
        fields: fields.map(field => this.analyzeField(field)),
        submitButton: this.findSubmitButton(form)
      };
    },

    analyzeField(field) {
      const label = field.labels?.[0]?.textContent?.trim() || 
                    field.getAttribute('aria-label') || 
                    field.getAttribute('placeholder') || 
                    field.name || 
                    '';

      return {
        tag: field.tagName.toLowerCase(),
        type: field.type || 'text',
        name: field.name || '',
        id: field.id || '',
        label: label,
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
        value: field.value || '',
        checked: field.checked || false,
        options: field.tagName.toLowerCase() === 'select' ? 
          Array.from(field.options).map(opt => ({ value: opt.value, text: opt.text })) : null
      };
    },

    findSubmitButton(form) {
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
      if (submitBtn) {
        return {
          tag: submitBtn.tagName.toLowerCase(),
          text: submitBtn.textContent?.trim() || submitBtn.value || 'Submit',
          selector: submitBtn.id ? '#' + submitBtn.id : submitBtn.tagName.toLowerCase()
        };
      }
      return null;
    }
  };

  // Smart filler
  const SmartFiller = {
    fill(field, value) {
      if (!field) return { success: false, error: 'Field not found' };

      const type = field.type || 'text';
      const tag = field.tagName.toLowerCase();

      try {
        if (tag === 'select') {
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
        } else if (type === 'checkbox' || type === 'radio') {
          field.checked = value === true || value === 'true' || value === 'yes' || value === 'on';
        } else {
          field.value = value;
        }

        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.dispatchEvent(new Event('blur', { bubbles: true }));

        return { success: true, field: field.name || field.id || type, value: value };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    fillForm(form, data) {
      const fields = Array.from(form.querySelectorAll('input, select, textarea'));
      const results = [];

      for (const [key, value] of Object.entries(data)) {
        const searchKey = key.toLowerCase();
        let filled = false;

        for (const field of fields) {
          const name = (field.name || '').toLowerCase();
          const id = (field.id || '').toLowerCase();
          const placeholder = (field.placeholder || '').toLowerCase();
          const label = (field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || '').toLowerCase();
          
          const identifier = name + ' ' + id + ' ' + placeholder + ' ' + label;

          if (identifier.includes(searchKey) || searchKey.includes(name) || searchKey.includes(id)) {
            const result = this.fill(field, value);
            results.push({ key, ...result });
            filled = true;
            break;
          }
        }

        if (!filled) {
          results.push({ key, success: false, error: 'No matching field found' });
        }
      }

      return results;
    }
  };

  // Expose to window for content script messaging
  window.SuperiorMCP = {
    OverlaySystem,
    ElementClassifier,
    FormAnalyzer,
    SmartFiller,

    getInteractiveElements(options = {}) {
      const { includeHidden = false, filterType = null, filterArea = null, maxElements = 200 } = options;
      
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

      const elements = [];
      let id = 1;

      allInteractive.forEach(el => {
        if (elements.length >= maxElements) return;

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 && 
                       style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0';

        if (!includeHidden && !visible) return;

        const classification = ElementClassifier.classify(el);
        
        if (filterType && !classification.type.includes(filterType) && classification.tag !== filterType) return;

        elements.push({
          id: id++,
          ...classification,
          text: el.textContent?.trim().substring(0, 100) || '',
          selector: this.getCSSPath(el),
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          visible: visible
        });
      });

      return elements;
    },

    getCSSPath(el) {
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
    },

    showOverlays(options = {}) {
      const elements = this.getInteractiveElements(options);
      const overlayIds = [];

      elements.forEach(el => {
        const element = document.querySelector(el.selector);
        if (element) {
          const overlayId = OverlaySystem.show(element, el.id);
          overlayIds.push(overlayId);
        }
      });

      return { elements, overlayIds, count: elements.length };
    },

    hideOverlays() {
      OverlaySystem.hideAll();
    },

    highlightElement(selector, color = '#00ff88') {
      return OverlaySystem.highlight(selector, color);
    }
  };

  console.log('[Superior MCP] Content script loaded and ready');
})();
