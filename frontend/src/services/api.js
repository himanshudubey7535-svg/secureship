const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function errorMessage(body, status) {
  const detail = body && body.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => `${(d.loc || []).slice(1).join('.') || 'input'}: ${d.msg}`)
      .join('; ');
  }
  return `Request failed (${status})`;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error('Cannot reach the SecureShip API. Is the backend running?');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, res.status));
  }
  return res;
}

const json = async (path, options) => (await request(path, options)).json();

export const api = {
  getScans: () => json('/scans'),
  getStats: () => json('/scans/stats'),
  getRecommendations: (id) => json(`/scans/${id}/recommendations`),
  getScan: (id) => json(`/scans/${id}`),
  createScan: (image_name, image_tag) =>
    json('/scans', { method: 'POST', body: JSON.stringify({ image_name, image_tag }) }),
  getVulnerabilities: (scanId, severity) =>
    json(`/scans/${scanId}/vulnerabilities${severity ? `?severity=${severity}` : ''}`),

  getPolicy: () => json('/policies'),
  updatePolicy: (policy) => json('/policies', { method: 'PUT', body: JSON.stringify(policy) }),

  async downloadReport(scanId, type) {
    const res = await request(`/reports/${scanId}/${type}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secureship-scan-${scanId}.${type}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
