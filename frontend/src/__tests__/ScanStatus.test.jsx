import { render, screen } from '@testing-library/react';
import ScanStatus, { scoreTone } from '../components/ScanStatus.jsx';

const completed = {
  id: 1, status: 'completed', full_reference: 'nginx:latest', security_score: 81.9,
  risk_category: 'Good', total_vulns: 1, critical_count: 1, high_count: 0, medium_count: 0,
  low_count: 0, unknown_count: 0,
  policy: { passed: false, violations: ['1 critical vulnerabilities found; policy allows at most 0'], warnings: [] },
};

test('shows the scanning state', () => {
  render(<ScanStatus scanning elapsed={12} />);
  expect(screen.getByText(/Scanning image/)).toBeInTheDocument();
});

test('shows result, category and failed policy', () => {
  render(<ScanStatus scan={completed} />);
  expect(screen.getByText('nginx:latest')).toBeInTheDocument();
  expect(screen.getByText('Good')).toBeInTheDocument();
  expect(screen.getByText('Policy failed')).toBeInTheDocument();
  expect(screen.getByText(/Blocked:/)).toBeInTheDocument();
});

test('shows the failure reason', () => {
  render(<ScanStatus scan={{ status: 'failed', full_reference: 'x:1', error_message: 'Image not found.' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Image not found.');
});

test('score tones follow the category thresholds', () => {
  expect(scoreTone(95)).toBe('good');
  expect(scoreTone(75)).toBe('ok');
  expect(scoreTone(50)).toBe('warn');
  expect(scoreTone(10)).toBe('bad');
});
