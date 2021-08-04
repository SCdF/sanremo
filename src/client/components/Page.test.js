import { useNavigate } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Page from './Page';

jest.mock('react-router-dom');

describe('Page', () => {
  let navigate;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);
  });

  it('renders without crashing', async () => {
    render(<Page />);
  });

  it('sets the title on page and on window', async () => {
    render(<Page title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(global.window.document.title).toBe('Test Title | Sanremo');
  });
});
