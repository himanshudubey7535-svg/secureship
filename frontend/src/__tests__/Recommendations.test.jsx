import { render, screen } from '@testing-library/react';
import Recommendations from '../components/Recommendations.jsx';

test('lists upgrade advice', () => {
  const data = { total_vulnerabilities: 3, fixable: 2, unfixable: 1, recommendations: [
    { package_name: 'openssl', installed_version: '1.0', upgrade_to: '1.1', fixes: 2, worst_severity: 'CRITICAL', cve_ids: ['A', 'B'] }] };
  render(<Recommendations data={data} />);
  expect(screen.getByText('openssl')).toBeInTheDocument();
  expect(screen.getByText(/1.0 → 1.1/)).toBeInTheDocument();
  expect(screen.getByText('2 CVEs')).toBeInTheDocument();
});

test('says nothing to fix for a clean image', () => {
  render(<Recommendations data={{ total_vulnerabilities: 0, fixable: 0, unfixable: 0, recommendations: [] }} />);
  expect(screen.getByText('Nothing to fix.')).toBeInTheDocument();
});
