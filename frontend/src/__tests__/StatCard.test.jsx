import { render, screen } from '@testing-library/react';
import StatCard from '../components/StatCard.jsx';

test('renders label and value', () => {
  render(<StatCard label="Total scans" value={7} />);
  expect(screen.getByText('Total scans')).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();
});
