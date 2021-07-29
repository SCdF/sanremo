import { render, screen, waitFor } from '@testing-library/react';
import Home from './Home';

import db from '../db';
jest.mock('../db');

test('renders without crashing', async () => {
  db.find.mockImplementation((options) => {
    // Repeatable list needs
    if (options?.selector?._id?.$gt === 'repeatable:instance:') {
      return Promise.resolve({
        docs: [{ _id: '1', template: 'repeatable:template:test:1', updated: Date.now(), slug: 'test slug value' }],
      });
    }

    if (options?.selector?._id?.$in?.length === 1 && options?.selector?._id?.$in[0] === 'repeatable:template:test:1') {
      return Promise.resolve({
        docs: [{ _id: 'repeatable:template:test:1', title: 'Repeatable in repeatable list', slug: { type: 'string' } }],
      });
    }

    // Template list needs
    if (options?.selector?._id?.$gt === 'repeatable:template:') {
      return Promise.resolve({ docs: [{ _id: 'repeatable:template:test:1', title: 'Template in template list' }] });
    }

    throw Error('noimplementation');
  });

  render(<Home db={db} />);

  await waitFor(() => screen.getByText(/Template in template list/));
  await waitFor(() => screen.getByText(/Repeatable in repeatable list/));
});

describe('template visibility', () => {
  test('when there are more than one version only show the latest', async () => {
    db.find.mockImplementation((options) => {
      // No repeatables
      if (options?.selector?._id?.$gt === 'repeatable:instance:') {
        return Promise.resolve({ docs: [] });
      }

      // Multiple versions of the same template
      if (options?.selector?._id?.$gt === 'repeatable:template:') {
        return Promise.resolve({
          docs: [
            { _id: 'repeatable:template:test:1', title: 'Old template version' },
            { _id: 'repeatable:template:test:2', title: 'New template version' },
            { _id: 'repeatable:template:test2:1', title: 'Another template' },
          ],
        });
      }

      throw Error('noimplementation');
    });

    render(<Home db={db} />);

    await waitFor(() => screen.getByText(/New template version/));
    await waitFor(() => screen.getByText(/Another template/));
    expect(() => screen.getByText(/Old template version/)).toThrowError(/Unable to find an element/);
  });

  test('if the latest version is deleted, do not display any versions of that template', async () => {
    db.find.mockImplementation((options) => {
      // No repeatables
      if (options?.selector?._id?.$gt === 'repeatable:instance:') {
        return Promise.resolve({ docs: [] });
      }

      // Multiple versions of the same template
      if (options?.selector?._id?.$gt === 'repeatable:template:') {
        return Promise.resolve({
          docs: [
            { _id: 'repeatable:template:test:1', title: 'Old template version' },
            { _id: 'repeatable:template:test:2', title: 'New template version', deleted: true },
            { _id: 'repeatable:template:test2:1', title: 'Another template' },
          ],
        });
      }

      throw Error('noimplementation');
    });

    render(<Home db={db} />);

    await waitFor(() => screen.getByText(/Another template/));
    expect(() => screen.getByText(/New template version/)).toThrowError(/Unable to find an element/);
  });
});
