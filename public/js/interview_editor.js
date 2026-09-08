/**
 * ============================================================================
 * INTERVIEW MODULE — LIGHTWEIGHT RICH TEXT EDITOR
 * ============================================================================
 * Safe, responsive, and dependency-free WYSIWYG editor for interview notes.
 * Supports: Bold, Italic, Underline, Bullet List, Numbered List, Quote, Undo, Redo, Clear Format.
 */

(function(window) {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeHtml(html) {
    if (!html) return '';
    // Basic sanitization to eliminate scripts and dangerous event handlers
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove forbidden tags
    const forbiddenTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'];
    forbiddenTags.forEach(tag => {
      const els = temp.querySelectorAll(tag);
      els.forEach(el => el.remove());
    });

    // Remove inline event handlers (onclick, onerror, etc.)
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      const attrs = Array.from(el.attributes);
      attrs.forEach(attr => {
        if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return temp.innerHTML;
  }

  function initRichEditor(targetElementId, initialContent = '', placeholder = 'Tulis catatan di sini...', minHeight = '100px') {
    const wrapper = document.getElementById(targetElementId);
    if (!wrapper) return null;

    const editorId = `editor_body_${targetElementId}`;
    const cleanContent = sanitizeHtml(initialContent);

    wrapper.innerHTML = `
      <div class="rich-editor-box" style="border: 1px solid var(--border-subtle, #cbd5e1); border-radius: 8px; background: var(--bg-card, #ffffff); overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s;">
        <div class="rich-editor-toolbar" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 8px; background: var(--bg-body, #f8fafc); border-bottom: 1px solid var(--border-subtle, #e2e8f0); align-items: center;">
          <button type="button" class="rich-tool-btn" data-command="bold" title="Tebal (Ctrl+B)" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-weight: bold; font-size: 0.85rem;">
            <i class="fa-solid fa-bold"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="italic" title="Miring (Ctrl+I)" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-style: italic; font-size: 0.85rem;">
            <i class="fa-solid fa-italic"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="underline" title="Garis Bawah (Ctrl+U)" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); text-decoration: underline; font-size: 0.85rem;">
            <i class="fa-solid fa-underline"></i>
          </button>
          <span style="display: inline-block; width: 1px; height: 18px; background: var(--border-subtle, #cbd5e1); margin: 0 4px;"></span>
          <button type="button" class="rich-tool-btn" data-command="insertUnorderedList" title="Daftar Poin" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-size: 0.85rem;">
            <i class="fa-solid fa-list-ul"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="insertOrderedList" title="Daftar Nomor" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-size: 0.85rem;">
            <i class="fa-solid fa-list-ol"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="formatBlock" data-val="blockquote" title="Kutipan" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-size: 0.85rem;">
            <i class="fa-solid fa-quote-left"></i>
          </button>
          <span style="display: inline-block; width: 1px; height: 18px; background: var(--border-subtle, #cbd5e1); margin: 0 4px;"></span>
          <button type="button" class="rich-tool-btn" data-command="undo" title="Urungkan" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-size: 0.85rem;">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="redo" title="Ulangi" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-main, #334155); font-size: 0.85rem;">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button type="button" class="rich-tool-btn" data-command="removeFormat" title="Hapus Format" style="padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-dim, #94a3b8); font-size: 0.85rem; margin-left: auto;">
            <i class="fa-solid fa-eraser"></i>
          </button>
        </div>
        <div 
          id="${editorId}" 
          class="rich-editor-content" 
          contenteditable="true" 
          data-placeholder="${escapeHtml(placeholder)}"
          style="min-height: ${minHeight}; max-height: 450px; overflow-y: auto; padding: 10px 14px; font-size: 0.9rem; line-height: 1.5; color: var(--text-main, #1e293b); outline: none;"
        >${cleanContent}</div>
      </div>
    `;

    const contentDiv = document.getElementById(editorId);
    const boxDiv = wrapper.querySelector('.rich-editor-box');

    // Focus / Blur effect
    if (contentDiv && boxDiv) {
      contentDiv.addEventListener('focus', () => {
        boxDiv.style.borderColor = 'var(--primary-500, #3b82f6)';
        boxDiv.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
      });
      contentDiv.addEventListener('blur', () => {
        boxDiv.style.borderColor = 'var(--border-subtle, #cbd5e1)';
        boxDiv.style.boxShadow = 'none';
      });
    }

    // Attach toolbar button listeners
    const buttons = wrapper.querySelectorAll('.rich-tool-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep focus in contenteditable
        const cmd = btn.getAttribute('data-command');
        const val = btn.getAttribute('data-val') || null;
        if (cmd) {
          document.execCommand(cmd, false, val);
          if (contentDiv) contentDiv.focus();
        }
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(0,0,0,0.06)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
    });

    return contentDiv;
  }

  function getRichEditorContent(targetElementId) {
    const editorId = `editor_body_${targetElementId}`;
    const contentDiv = document.getElementById(editorId);
    if (!contentDiv) return '';
    const raw = contentDiv.innerHTML.trim();
    if (raw === '<p><br></p>' || raw === '<br>' || raw === '<p></p>') return '';
    return sanitizeHtml(raw);
  }

  function setRichEditorContent(targetElementId, html) {
    const editorId = `editor_body_${targetElementId}`;
    const contentDiv = document.getElementById(editorId);
    if (contentDiv) {
      contentDiv.innerHTML = sanitizeHtml(html);
    }
  }

  window.InterviewEditor = {
    init: initRichEditor,
    getContent: getRichEditorContent,
    setContent: setRichEditorContent,
    sanitizeHtml: sanitizeHtml,
    escapeHtml: escapeHtml,
  };

})(window);
