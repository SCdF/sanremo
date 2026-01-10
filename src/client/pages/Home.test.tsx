import type { Store } from '@reduxjs/toolkit';
import { screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react/jsx-runtime';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import db, { type Database } from '../db';
import { setUserAsLoggedIn } from '../features/User/userSlice';
import { createStore } from '../store';
import { withStore, render as wrappedRender } from '../test-utils';
import Home from './Home';

vi.mock('../db');

describe('Home', () => {
  const user = { id: 1, name: 'Tester Test' };
  let store: Store;
  let handle: Mocked<Database>;
  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user }));
    handle = db(user) as Mocked<Database>;
  });

  function render(children: JSX.Element) {
    wrappedRender(withStore(store, children));
  }

  it('renders without crashing', async () => {
    handle.find.mockImplementation((options) => {
      if (!(options?.selector?._id instanceof Object)) {
        throw Error('noimplementation');
      }

      // Repeatable list needs
      if (options?.selector?._id?.$gt === 'repeatable:instance:') {
        return Promise.resolve({
          docs: [
            {
              _id: '1',
              _rev: '1-abc',
              template: 'repeatable:template:test:1',
              updated: Date.now(),
              slug: 'test slug value',
            },
          ],
        });
      }

      if (
        options?.selector?._id?.$in?.length === 1 &&
        options?.selector?._id?.$in[0] === 'repeatable:template:test:1'
      ) {
        return Promise.resolve({
          docs: [
            {
              _id: 'repeatable:template:test:1',
              _rev: '1-abc',
              title: 'Repeatable in repeatable list',
              slug: { type: 'string' },
            },
          ],
        });
      }

      // Template list needs
      if (options?.selector?._id?.$gt === 'repeatable:template:') {
        return Promise.resolve({
          docs: [
            {
              _id: 'repeatable:template:test:1',
              _rev: '1-abc',
              title: 'Template in template list',
            },
          ],
        });
      }

      throw Error('noimplementation');
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Template in template list/));
    await waitFor(() => screen.getByText(/Repeatable in repeatable list/));
  });

  describe('template visibility', () => {
    it('when there are more than one version only show the latest', async () => {
      handle.find.mockImplementation((options) => {
        if (!(options?.selector?._id instanceof Object)) {
          throw Error('noimplementation');
        }

        // No repeatables
        if (options?.selector?._id?.$gt === 'repeatable:instance:') {
          return Promise.resolve({ docs: [] });
        }

        // Multiple versions of the same template
        if (options?.selector?._id?.$gt === 'repeatable:template:') {
          return Promise.resolve({
            docs: [
              { _id: 'repeatable:template:test:1', _rev: '1-abc', title: 'Old template version' },
              { _id: 'repeatable:template:test:2', _rev: '1-abc', title: 'New template version' },
              { _id: 'repeatable:template:test2:1', _rev: '1-abc', title: 'Another template' },
            ],
          });
        }

        throw Error('noimplementation');
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => screen.getByText(/New template version/));
      await waitFor(() => screen.getByText(/Another template/));
      expect(() => screen.getByText(/Old template version/)).toThrowError(
        /Unable to find an element/,
      );
    });

    it('if the latest version is deleted, do not display any versions of that template', async () => {
      handle.find.mockImplementation((options) => {
        if (!(options?.selector?._id instanceof Object)) {
          throw Error('noimplementation');
        }

        // No repeatables
        if (options?.selector?._id?.$gt === 'repeatable:instance:') {
          return Promise.resolve({ docs: [] });
        }

        // Multiple versions of the same template
        if (options?.selector?._id?.$gt === 'repeatable:template:') {
          return Promise.resolve({
            docs: [
              { _id: 'repeatable:template:test:1', _rev: '1-abc', title: 'Old template version' },
              {
                _id: 'repeatable:template:test:2',
                _rev: '1-abc',
                title: 'New template version',
                deleted: true,
              },
              { _id: 'repeatable:template:test2:1', _rev: '1-abc', title: 'Another template' },
            ],
          });
        }

        throw Error('noimplementation');
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );

      await waitFor(() => screen.getByText(/Another template/));
      expect(() => screen.getByText(/New template version/)).toThrowError(
        /Unable to find an element/,
      );
      expect(() => screen.getByText(/Old template version/)).toThrowError(
        /Unable to find an element/,
      );
    });
  });
});
