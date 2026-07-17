"use client";

import { useEffect } from "react";

/**
 * DevToolsProtection — Componente de segurança frontend
 *
 * Camadas de proteção implementadas:
 * 1. Bloqueia clique direito (contextmenu)
 * 2. Bloqueia atalhos de teclado (F12, Ctrl+Shift+I, Ctrl+U, etc.)
 * 3. Detecta abertura do DevTools via diferença de tamanho de janela
 * 4. Desativa seleção de texto
 * 5. Sobrescreve console (log, warn, error, info, debug, table, dir)
 * 6. Loop de debugger para travar o painel de inspeção
 */
export default function DevToolsProtection() {
  useEffect(() => {
    // ─── 1. Bloquear clique direito ───────────────────────────────────────────
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", blockContextMenu);

    // ─── 2. Bloquear atalhos de teclado ──────────────────────────────────────
    const blockKeyShortcuts = (e: KeyboardEvent) => {
      const key = e.key?.toUpperCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // F12
      if (key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I — Inspecionar
      if (ctrl && shift && key === "I") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J — Console
      if (ctrl && shift && key === "J") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C — Seletor de elementos
      if (ctrl && shift && key === "C") {
        e.preventDefault();
        return false;
      }
      // Ctrl+U — Ver código fonte
      if (ctrl && key === "U") {
        e.preventDefault();
        return false;
      }
      // Ctrl+S — Salvar página
      if (ctrl && key === "S") {
        e.preventDefault();
        return false;
      }
      // Ctrl+A — Selecionar tudo
      if (ctrl && key === "A") {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", blockKeyShortcuts);

    // ─── 3. Desabilitar seleção de texto via CSS dinâmico ────────────────────
    const style = document.createElement("style");
    style.id = "__sec_no_select";
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // ─── 4. Sobrescrever console ──────────────────────────────────────────────
    const noop = () => {};
    const consoleMethods = [
      "log", "warn", "error", "info", "debug",
      "table", "dir", "dirxml", "group", "groupEnd",
      "groupCollapsed", "time", "timeEnd", "timeLog",
      "count", "countReset", "assert", "clear", "trace",
    ] as const;

    type ConsoleKey = typeof consoleMethods[number];
    const originalConsole: Partial<Record<ConsoleKey, (...args: unknown[]) => void>> = {};

    consoleMethods.forEach((method) => {
      originalConsole[method] = console[method as keyof Console] as (...args: unknown[]) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any)[method] = noop;
    });

    // ─── 5. Detectar DevTools por dimensão da janela ──────────────────────────
    let devToolsOpen = false;
    const THRESHOLD = 160;

    const detectBySize = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > THRESHOLD || heightDiff > THRESHOLD) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          handleDevToolsOpen();
        }
      } else {
        devToolsOpen = false;
      }
    };

    const handleDevToolsOpen = () => {
      // Limpar todo o conteúdo visível
      document.body.innerHTML = `
        <div style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          height:100vh;
          background:#0a0a0c;
          color:#f3f4f6;
          font-family:Inter,sans-serif;
          gap:16px;
          text-align:center;
        ">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h1 style="font-size:1.5rem;font-weight:700;color:#ef4444;margin:0">Acesso Negado</h1>
          <p style="color:#6b7280;margin:0;font-size:0.95rem;max-width:320px">
            Esta ação não é permitida. Feche as ferramentas de desenvolvimento para continuar.
          </p>
        </div>
      `;
    };

    const sizeDetectionInterval = setInterval(detectBySize, 1000);

    // ─── 6. Loop de debugger ──────────────────────────────────────────────────
    // Trava o painel enquanto o DevTools estiver aberto
    const debuggerLoop = () => {
      function devtoolsDetector() {
        // eslint-disable-next-line no-debugger
        debugger;
      }
      setInterval(devtoolsDetector, 100);
    };
    debuggerLoop();

    // ─── 7. Bloquear drag de elementos ───────────────────────────────────────
    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("dragstart", blockDrag);

    // ─── 8. Bloquear print (Ctrl+P) ──────────────────────────────────────────
    const blockPrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toUpperCase() === "P") {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", blockPrint);

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeyShortcuts);
      document.removeEventListener("keydown", blockPrint);
      document.removeEventListener("dragstart", blockDrag);
      clearInterval(sizeDetectionInterval);

      // Restaurar console
      consoleMethods.forEach((method) => {
        if (originalConsole[method]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (console as any)[method] = originalConsole[method];
        }
      });

      const injectedStyle = document.getElementById("__sec_no_select");
      if (injectedStyle) injectedStyle.remove();
    };
  }, []);

  return null;
}
