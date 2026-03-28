'use client';

/**
 * GrapesJS Email Editor wrapper.
 * Isolated component — remove this file + the import in AdminEmailTemplatesPage
 * to fully revert to the basic editor.
 *
 * Dependencies: grapesjs, grapesjs-preset-newsletter
 * npm uninstall grapesjs grapesjs-preset-newsletter  ← to clean up
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface GrapesEmailEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  onReady?: () => void;
}

export default function GrapesEmailEditor({ initialHtml, onChange, onReady }: GrapesEmailEditorProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const initEditor = useCallback(async () => {
    if (!containerRef.current || editorRef.current) return;

    const grapesjs = (await import('grapesjs')).default;
    const newsletterPreset = (await import('grapesjs-preset-newsletter')).default;

    // Load GrapesJS CSS via link tag (avoids Next.js manifest issues)
    if (!document.querySelector('link[data-grapes-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
      link.setAttribute('data-grapes-css', '1');
      document.head.appendChild(link);
      // Wait for CSS to load before initializing
      await new Promise<void>(resolve => {
        link.onload = () => resolve();
        link.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    }

    const editor = grapesjs.init({
      container: containerRef.current,
      height: '600px',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      plugins: [newsletterPreset],
      pluginsOpts: {
        [newsletterPreset as any]: {
          modalTitleImport: 'ייבוא HTML',
          modalTitleExport: 'ייצוא HTML',
        },
      },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap',
        ],
      },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' },
        ],
      },
    });

    // Set initial content
    if (initialHtml) {
      editor.setComponents(initialHtml);
    }

    // Sync changes back via callback (debounced)
    let timeout: ReturnType<typeof setTimeout>;
    const syncHtml = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const html = editor.getHtml();
        const css = editor.getCss();
        const fullHtml = css ? `<style>${css}</style>${html}` : html;
        onChange(fullHtml);
      }, 500);
    };

    editor.on('component:update', syncHtml);
    editor.on('canvas:drop', syncHtml);
    editor.on('component:add', syncHtml);
    editor.on('component:remove', syncHtml);

    editorRef.current = editor;
    setLoading(false);
    onReady?.();
  }, []); // intentionally empty — we only init once

  useEffect(() => {
    initEditor();
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [initEditor]);

  return (
    <div className="relative grapes-editor-wrap">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 rounded-lg">
          <div className="text-amber-400 text-sm">טוען עורך...</div>
        </div>
      )}
      <div
        ref={containerRef}
        className="grapes-editor-container"
      />
      <style>{`
        .grapes-editor-wrap { direction: ltr; }
        .grapes-editor-container .gjs-one-bg { background-color: #0f172a; }
        .grapes-editor-container .gjs-two-color { color: #e2e8f0; }
        .grapes-editor-container .gjs-three-bg { background-color: #1e293b; }
        .grapes-editor-container .gjs-four-color,
        .grapes-editor-container .gjs-four-color-h:hover { color: #fbbf24; }
        .grapes-editor-container .gjs-pn-panel { background-color: #0f172a; border-color: rgba(255,255,255,0.1); }
        .grapes-editor-container .gjs-block { color: #e2e8f0; border-color: rgba(255,255,255,0.1); min-height: auto; }
        .grapes-editor-container .gjs-block:hover { border-color: #fbbf24; }
        .grapes-editor-container .gjs-sm-sector-title { background-color: #1e293b; color: #e2e8f0; }
        .grapes-editor-container .gjs-clm-tags .gjs-sm-tag { background-color: #334155; color: #e2e8f0; }
        .grapes-editor-container .gjs-pn-btn.gjs-pn-active { color: #fbbf24; }
        .grapes-editor-container .gjs-cv-canvas { background-color: #f1f5f9; }
        .grapes-editor-container .gjs-frame-wrapper { overflow: auto; }
      `}</style>
    </div>
  );
}
