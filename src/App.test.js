import { render, screen } from '@testing-library/react';
import App from './App';

test('Basic test', () => {
  render(<App />);
  const linkElement = screen.getByText(/Sanremo/i);
  expect(linkElement).toBeInTheDocument();
});
