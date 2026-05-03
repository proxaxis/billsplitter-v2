const API_BASE = (import.meta.env.VITE_API_URL || 'https://bill-server.xcw.me:50001').replace(/\/$/, '');

export function toSafeString(value) {
  return encodeURIComponent(value);
}

export function hasUndefined(obj) {
  return Object.values(obj).some((value) => value === undefined);
}

export async function request(path, options = {}) {
  const endpoint = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const opt = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  if (opt.method === 'GET') {
    console.log('HTTP GET Request To:', endpoint);
  } else {
    console.log('HTTP Request To:', endpoint, '\n', options);
  }

  if (options.body) {
    try {
      if (hasUndefined(options.body)) {
        throw new Error('Request body contains undefined values');
      }
      opt.body = JSON.stringify(options.body);
    } catch (e) {
      console.warn('Failed to parse request body for undefined check:', e);
    }
  }
  
  const response = await fetch(endpoint, opt);

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export default {
  toSafeString,
  hasUndefined,
  request,
};
