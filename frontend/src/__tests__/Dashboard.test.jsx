import { render, screen } from '@testing-library/react';
import { Distribution, formatDate } from '../pages/Dashboard.jsx';

test('distribution shows an empty state when there are no findings', () => {
  render(<Distribution distribution={{ critical: 0, high: 0, medium: 0, low: 0, unknown: 0 }} />);
  expect(screen.getByText(/No vulnerabilities recorded/)).toBeInTheDocument();
});

test('distribution lists each severity count', () => {
  render(<Distribution distribution={{ critical: 2, high: 5, medium: 0, low: 1, unknown: 0 }} />);
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('Critical')).toBeInTheDocument();
});

test('formatDate handles missing values', () => {
  expect(formatDate(null)).toBe('-');
});
