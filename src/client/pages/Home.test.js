import { render, screen, waitFor } from '@testing-library/react';
import Home from './Home';

import db from '../db';
jest.mock('../db');

test('renders without crashing', async () => {
  db.find.mockImplementation(options => {
    if (options?.selector?._id?.$gt === 'repeatable:instance:') {
      return Promise.resolve({docs: [
        {_id: '1', template: '2', updated: Date.now()}
      ]});
    }

    if (options?.selector?._id?.$gt === 'repeatable:template:') {
      return Promise.resolve({docs: [
        {_id: '2', title: 'Template in template list'}
      ]});
    }

    if (options?.selector?._id?.$in?.length === 1 &&
        options?.selector?._id?.$in[0] === '2') {
      return Promise.resolve({docs: [
        {_id: '2', title: 'Repeatable in repeatable list'}
      ]});
    }

    throw Error('noimplementation');
  });

  render(<Home db={db}/>);

  await waitFor(() => screen.getByText(/Template in template list/));
  await waitFor(() => screen.getByText(/Repeatable in repeatable list/));
});

// TODO: deciding what templates to show
