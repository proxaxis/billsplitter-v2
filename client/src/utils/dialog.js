let dialogBridge = null;

export function registerDialogBridge(bridge) {
  dialogBridge = bridge;
  return () => {
    if (dialogBridge === bridge) {
      dialogBridge = null;
    }
  };
}

function toText(value) {
  return String(value?.trim() ?? '');
}

function callBridge(method, message, options = {}) {
  const text = toText(message);

  if (dialogBridge && typeof dialogBridge[method] === 'function') {
    return Promise.resolve(dialogBridge[method](text, options));
  }

  if (typeof window === 'undefined') {
    if (method === 'confirm') return Promise.resolve(false);
    if (method === 'prompt') return Promise.resolve(null);
    return Promise.resolve(undefined);
  }

  if (method === 'confirm' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(text));
  }

  if (method === 'prompt' && typeof window.prompt === 'function') {
    return Promise.resolve(window.prompt(text, toText(options.defaultValue)));
  }

  if (method === 'alert' && typeof window.alert === 'function') {
    window.alert(text);
    return Promise.resolve(undefined);
  }

  if (method === 'confirm') return Promise.resolve(false);
  if (method === 'prompt') return Promise.resolve(null);

  console.info(text);
  return Promise.resolve(undefined);
}

export const dialog = {
  alert(message, options = {}) {
    return callBridge('alert', message, options);
  },
  confirm(message, options = {}) {
    return callBridge('confirm', message, options);
  },
  prompt(message, options = {}) {
    return callBridge('prompt', message, options);
  },
};

export default dialog;
