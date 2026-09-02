const SHADOW_HOST_IDS = ["lua-shadow-root-embedded", "lua-shadow-root"] as const;

/** Pin messages + input within the dock viewport (theme-neutral layout only). */
const EMBEDDED_LAYOUT_OVERRIDES = `
  :host {
    display: block !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;
    width: 100% !important;
  }

  .lua-pop-embedded,
  .lua-pop-embedded-root,
  .lua-pop-chat,
  [class*="lua-pop-embedded-root"],
  [class*="lua-pop-chat-container"] {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  [class*="chat-header"],
  [class*="lua-pop-chat-header"] {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    flex-shrink: 0 !important;
  }

  [class*="message-list"],
  [class*="messages-container"],
  [class*="chat-messages"],
  [class*="conversation"],
  [class*="messages-wrapper"],
  main[class*="chat"] {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding: 12px 14px !important;
  }

  [class*="chat-input-container"],
  [class*="input-container"],
  [class*="composer"],
  [class*="input-area"],
  footer[class*="chat"],
  form[class*="chat"] {
    flex-shrink: 0 !important;
    margin-top: auto !important;
    padding: 0 !important;
    border-top: none !important;
    background: transparent !important;
  }

  textarea,
  [class*="chat-input"],
  [class*="lua-pop-chat-input"],
  #lua-pop-chat-input,
  [data-slot="input-group-control"] {
    resize: none !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    font-size: 14px !important;
    line-height: 1.45 !important;
  }

  textarea:focus,
  #lua-pop-chat-input:focus,
  [data-slot="input-group-control"]:focus,
  [data-slot="input-group-control"]:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }

  .lua-pop-input-region,
  [class*="lua-pop-input-region"] {
    flex-shrink: 0 !important;
    margin-top: auto !important;
    padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)) !important;
    border-top: none !important;
    background: transparent !important;
  }

  .lua-pop-input-region form,
  .lua-pop-input-region [data-slot="input-group"] {
    width: 100% !important;
  }

  [data-slot="input-group"] {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
    border-radius: 14px !important;
    border: 1px solid hsl(150 10% 88%) !important;
    background: hsl(0 0% 100%) !important;
    box-shadow: 0 1px 2px hsl(160 18% 12% / 0.05) !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    --tw-ring-shadow: 0 0 #0000 !important;
    --tw-ring-offset-shadow: 0 0 #0000 !important;
  }

  [data-slot="input-group"]:has([data-slot="input-group-control"]:focus-visible) {
    border-color: hsl(155 45% 42% / 0.55) !important;
    box-shadow: 0 0 0 3px hsl(155 62% 24% / 0.12) !important;
  }

  [data-slot="input-group-control"],
  #lua-pop-chat-input {
    flex: 0 0 auto !important;
    width: 100% !important;
    min-height: 0 !important;
    max-height: 120px !important;
    height: auto !important;
    field-sizing: content !important;
    padding: 12px 14px 8px !important;
    margin: 0 !important;
    color: hsl(160 18% 12%) !important;
  }

  [data-slot="input-group-control"]::placeholder,
  #lua-pop-chat-input::placeholder {
    color: hsl(160 10% 58%) !important;
  }

  [data-slot="input-group-addon"][data-align="block-end"] {
    order: 2 !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 0 8px 8px !important;
    margin: 0 !important;
    border: none !important;
    background: transparent !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 6px !important;
  }

  [data-slot="input-group-addon"][data-align="block-end"] > div:first-child {
    display: flex !important;
    align-items: center !important;
    gap: 2px !important;
  }

  [data-slot="input-group-addon"][data-align="block-end"] button:not([data-slot="prompt-input-submit"]) {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    color: hsl(160 12% 42%) !important;
    background: transparent !important;
  }

  [data-slot="input-group-addon"][data-align="block-end"] button:not([data-slot="prompt-input-submit"]):hover {
    background: hsl(150 8% 94%) !important;
    color: hsl(160 18% 12%) !important;
  }

  [data-slot="prompt-input-submit"] {
    flex-shrink: 0 !important;
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    padding: 0 !important;
    border-radius: 9999px !important;
    background: hsl(155 62% 24%) !important;
    color: hsl(0 0% 100%) !important;
    border: none !important;
    box-shadow: none !important;
  }

  [data-slot="prompt-input-submit"]:not(:disabled):hover {
    background: hsl(155 62% 20%) !important;
    opacity: 1 !important;
  }

  [data-slot="prompt-input-submit"]:disabled {
    background: hsl(150 8% 82%) !important;
    color: hsl(0 0% 100%) !important;
    opacity: 1 !important;
    cursor: not-allowed !important;
  }

  [class*="message-bubble-agent"],
  .chat-message-bubble-agent {
    max-width: 92% !important;
    margin-inline-end: auto !important;
  }

  [class*="message-bubble-user"],
  .chat-message-bubble-user {
    max-width: 92% !important;
    margin-inline-start: auto !important;
  }
`;

const LIGHT_OVERRIDES = `
  :host,
  .lua-pop-embedded,
  .lua-pop-embedded-root,
  .lua-pop-chat,
  [class*="lua-pop-embedded"] {
    background-color: hsl(0 0% 100%) !important;
    color: hsl(160 18% 12%) !important;
  }

  [class*="chat-input-container"],
  [class*="input-container"],
  [class*="composer"],
  [class*="input-area"],
  footer[class*="chat"],
  form[class*="chat"] {
    border-top: none !important;
    background: transparent !important;
  }

  [class*="message-bubble-user"],
  .chat-message-bubble-user {
    background-color: hsl(150 8% 94%) !important;
    color: hsl(160 18% 12%) !important;
  }

  [class*="message-bubble-agent"],
  .chat-message-bubble-agent {
    color: hsl(160 18% 12%) !important;
  }

  input,
  textarea,
  [class*="chat-input"],
  [class*="lua-pop-chat-input"],
  #lua-pop-chat-input,
  [data-slot="input-group-control"] {
    background-color: transparent !important;
    color: hsl(160 18% 12%) !important;
    border-color: transparent !important;
  }
`;

/** Match Mizan dark tokens (--background, --card, --border, --foreground). */
const DARK_OVERRIDES = `
  :host,
  .lua-pop-embedded,
  .lua-pop-embedded-root,
  .lua-pop-chat,
  [class*="lua-pop-embedded"] {
    background-color: hsl(160 14% 8%) !important;
    color: hsl(150 10% 96%) !important;
  }

  [class*="chat-input-container"],
  [class*="input-container"],
  [class*="composer"],
  [class*="input-area"],
  footer[class*="chat"],
  form[class*="chat"] {
    border-top: none !important;
    background: transparent !important;
  }

  [data-slot="input-group"] {
    border-color: hsl(160 10% 22%) !important;
    background: hsl(160 12% 10%) !important;
    box-shadow: 0 1px 2px hsl(0 0% 0% / 0.18) !important;
  }

  [data-slot="input-group"]:has([data-slot="input-group-control"]:focus-visible) {
    border-color: hsl(155 50% 42% / 0.55) !important;
    box-shadow: 0 0 0 3px hsl(155 62% 24% / 0.2) !important;
  }

  [data-slot="input-group-control"],
  #lua-pop-chat-input {
    color: hsl(150 10% 96%) !important;
  }

  [data-slot="input-group-control"]::placeholder,
  #lua-pop-chat-input::placeholder {
    color: hsl(150 8% 58%) !important;
  }

  [data-slot="input-group-addon"][data-align="block-end"] button:not([data-slot="prompt-input-submit"]):hover {
    background: hsl(160 10% 16%) !important;
    color: hsl(150 10% 96%) !important;
  }

  [data-slot="prompt-input-submit"]:disabled {
    background: hsl(160 10% 24%) !important;
    color: hsl(150 10% 70%) !important;
  }

  input,
  textarea,
  [class*="chat-input"],
  [class*="lua-pop-chat-input"],
  #lua-pop-chat-input,
  [data-slot="input-group-control"] {
    background-color: transparent !important;
    color: hsl(150 10% 96%) !important;
    border-color: transparent !important;
  }

  [class*="message-bubble-user"],
  .chat-message-bubble-user {
    background-color: hsl(160 10% 16%) !important;
    color: hsl(150 10% 96%) !important;
  }

  [class*="message-bubble-agent"],
  .chat-message-bubble-agent {
    color: hsl(150 10% 96%) !important;
  }

  button,
  [class*="send"],
  [class*="attachment"] {
    color: hsl(150 10% 88%) !important;
  }
`;

/** Align LuaPop shadow DOM with Mizan light/dark theme. */
export function syncLuaPopTheme(theme: "light" | "dark"): void {
  if (typeof document === "undefined") return;

  for (const id of SHADOW_HOST_IDS) {
    const host = document.getElementById(id);
    if (!host) continue;

    host.style.display = "block";
    host.style.height = "100%";
    host.style.maxHeight = "100%";
    host.style.minHeight = "0";
    host.style.width = "100%";
    host.style.colorScheme = theme;

    host.classList.toggle("dark", theme === "dark");

    const root = host.shadowRoot;
    if (!root) continue;

    root.querySelectorAll(".dark, .light").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("dark", theme === "dark");
      }
    });

    const embeddedRoot = root.querySelector(".lua-pop-embedded-root, .lua-pop-widget");
    if (embeddedRoot instanceof HTMLElement) {
      embeddedRoot.classList.toggle("dark", theme === "dark");
    }

    let styleEl = root.querySelector<HTMLStyleElement>("#mizan-luapop-theme");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "mizan-luapop-theme";
      root.appendChild(styleEl);
    }
    styleEl.textContent =
      EMBEDDED_LAYOUT_OVERRIDES + (theme === "dark" ? DARK_OVERRIDES : LIGHT_OVERRIDES);
  }
}
