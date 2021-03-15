import { render, screen } from '@testing-library/react';
import Page from './Page';

test('renders without crashing', async () => {
  render(<Page />);
});

test('sets the title on page and on window', async () => {
  render(<Page title='Test Title' />);

  expect(screen.getByText('Test Title')).toBeInTheDocument();
  expect(global.window.document.title).toBe('Test Title | Sanremo');
});
