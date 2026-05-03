let toastBridge = null;

export function registerToastBridge(bridge) {
  toastBridge = bridge;
  return () => {
    if (toastBridge === bridge) {
      toastBridge = null;
    }
  };
}

function callBridge(method, text, options) {
  const message = String(text || '');
  if (!message) return;

  if (toastBridge && typeof toastBridge[method] === 'function') {
    toastBridge[method](message, options);
    return;
  }

  if (method === 'alert' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
    return;
  }

  console.info(message);
}

export const toast = {
  alert(text, options = {}) {
    callBridge('alert', text, options);
  },
  message(text, options = {}) {
    callBridge('message', text, options);
  },
};

export default toast;
