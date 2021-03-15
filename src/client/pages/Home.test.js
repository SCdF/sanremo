import { render, screen, waitFor } from '@testing-library/react';
import Home from './Home';

import db from '../db';
jest.mock('../db');

beforeAll(() => {
});
beforeEach(() => {
});

test('renders without crashing', async () => {
  db.find.mockImplementation(options => {
    if (options?.selector?._id?.$gt === 'checklist:instance:') {
      return Promise.resolve({docs: [
        {_id: '1', title: 'A checklist', updated: Date.now()}
      ]});
    }

    if (options?.selector?._id?.$gt === 'checklist:template:') {
      return Promise.resolve({docs: [
        {_id: '1', title: 'A template'}
      ]});
    }
  });

  render(<Home db={db}/>);

  await waitFor(() => screen.getByText(/A checklist/));
  await waitFor(() => screen.getByText(/A template/));
});
