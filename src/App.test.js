import { render, screen } from '@testing-library/react';
import App from './App';

import db from './db';
jest.mock(db);

beforeAll(() => {
  db.mockImplementation(() => {
    return {
      find: Promise.resolve({docs: []})
    }
  })
});

beforeEach(() => {
  db.mockClear();
});

test('Basic test', () => {
  render(<App />);
  const linkElement = screen.getByText(/Sanremo/i);
  expect(linkElement).toBeInTheDocument();
});
