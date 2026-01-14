import { fireEvent, screen, waitFor } from '@testing-library/react';
// biome-ignore lint/correctness/noUnusedImports: React is required for JSX transform in .jsx files
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import db from '../db';
import { setUserAsLoggedIn } from '../features/User/userSlice';
import { createStore } from '../store';
import { withStore, render as wrappedRender } from '../test-utils';
import Repeatable from './Repeatable';

vi.mock('react-router-dom');
vi.mock('../db');

describe('Repeatable', () => {
  const user = { id: 1, name: 'Tester Test' };
  let navigate;
  let store;
  let handle;

  beforeEach(() => {
    navigate = vi.fn();
    useNavigate.mockReturnValue(navigate);

    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user }));

    handle = db(user);
  });

  function render(children) {
    wrappedRender(withStore(store, children));
  }

  it('renders without crashing', async () => {
    handle.get
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:1234',
        template: 'repeatable:template:5678',
        values: [],
      })
      .mockResolvedValueOnce({
        _id: 'repeatable:template:5678',
        title: 'A Repeatable',
        markdown: 'Some text',
      });
    useLocation.mockReturnValue();
    useParams.mockReturnValue({ repeatableId: '1234' });

    render(<Repeatable />);

    await waitFor(() => screen.getByText(/Some text/));
    expect(handle.get).toBeCalledTimes(2);
  });

  it('creates new instance and redirects if "new"', async () => {
    handle.get
      .mockResolvedValueOnce({
        _id: 'repeatable:template:1234',
        _rev: '42-abc',
        slug: {
          type: 'string',
        },
      })
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:1234',
        _rev: '42-abc',
        slug: 'test',
        values: [],
      });
    handle.userPut.mockResolvedValue({ id: '4321' });
    useLocation.mockReturnValue({
      search: '?template=repeatable:template:1234',
    });
    useParams
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValue({ repeatableId: '5678' });

    render(<Repeatable db={handle} />);

    expect(handle.get).toBeCalled();
    expect(handle.get.mock.calls[0][0]).toBe('repeatable:template:1234');

    await waitFor(() => expect(navigate.mock.calls.length).toBe(1));
    expect(navigate.mock.calls[0][0]).toMatch(/\/repeatable\/repeatable:instance:/);

    expect(handle.userPut).toBeCalled();
    const storedRepeatable = handle.userPut.mock.calls[0][0];
    expect(storedRepeatable).toBeTruthy();
    expect(storedRepeatable._id).toMatch(/^repeatable:instance:/);
    expect(storedRepeatable._rev).not.toBeTruthy();
    expect(storedRepeatable.created).toBeLessThan(Date.now());
    expect(storedRepeatable.updated).toBe(storedRepeatable.created);
    expect(storedRepeatable).toMatchObject({
      template: 'repeatable:template:1234',
    });
  });

  describe('completion redirection semantics', () => {
    let repeatable;
    let template;
    beforeEach(() => {
      handle.get.mockReset();
      handle.userPut.mockReset();
      useLocation.mockReset();
      useParams.mockReset();

      repeatable = {
        _id: 'repeatable:instance:1234',
        template: 'repeatable:template:5678',
        values: [false],
      };
      template = {
        _id: 'repeatable:template:5678',
        markdown: 'Some text\n- [ ] Something to change',
        values: [false],
      };

      handle.get.mockImplementation((docId) => {
        if (docId === 'repeatable:instance:1234') {
          return Promise.resolve(repeatable);
        }
        if (docId === 'repeatable:template:5678') {
          return Promise.resolve(template);
        }
        return Promise.reject(`Bad ${docId}`);
      });
      useLocation.mockReturnValue();
      useParams.mockReturnValue({ repeatableId: 'repeatable:instance:1234' });
      handle.userPut.mockResolvedValue({ rev: '2-abc' });
    });

    it('redirects when completing a fresh repeatable', async () => {
      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(navigate.mock.calls[0][0]).toBe('/'));
    });
    it('doesnt redirect when uncompleting a repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));

      expect(navigate.mock.calls.length).toBe(0);
      expect(handle.userPut.mock.calls[0][0].completed).not.toBeTruthy();
    });
    it('doesnt redirect when completing a just uncompleted repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect(handle.userPut.mock.calls[0][0].completed).not.toBeTruthy();

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(2));
      expect(navigate.mock.calls.length).toBe(0);
      expect(handle.userPut.mock.calls[1][0].completed).toBeTruthy();
    });
    it('does redirect when completing a just uncompleted repeatable if you change something', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Something to change/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect(handle.userPut.mock.calls[0][0].completed).not.toBeTruthy();

      // Click the checkbox (not the text) to toggle it
      fireEvent.click(await waitFor(() => screen.getByRole('checkbox', { name: /Task 1/ })));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(2));

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(3));
      expect(navigate.mock.calls.length).toBe(1);
      expect(handle.userPut.mock.calls[2][0].completed).toBeTruthy();
      expect(navigate.mock.calls[0][0]).toBe('/');
    });
  });
});
