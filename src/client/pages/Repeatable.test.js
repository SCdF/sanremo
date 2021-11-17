import { fireEvent, render as renderRtl, screen, waitFor } from '@testing-library/react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';

import db from '../db';

import Repeatable from './Repeatable';
import { createStore } from '../store';
import { setUserAsLoggedIn } from '../features/User/userSlice';
import { writeComplete } from '../features/Repeatable/repeatableSlice';

jest.mock('react-router-dom');
jest.mock('../db');

describe('Repeatable', () => {
  const user = { id: 1, name: 'Tester Test' };
  let navigate;
  let store;
  let handle;

  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);

    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user }));

    handle = db(user);
  });

  function render(children) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  it('renders without crashing', async () => {
    handle.get
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:',
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
    handle.userPutDeleteMe.mockResolvedValue({ id: '4321' });
    useLocation.mockReturnValue({
      search: '?template=repeatable:template:1234',
    });
    useParams
      // FIXME: I have no idea why I need to do this twice
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValue({ repeatableId: '5678' });

    render(<Repeatable db={handle} />);

    expect(handle.get).toBeCalled();
    expect(handle.get.mock.calls[0][0]).toBe('repeatable:template:1234');

    await waitFor(() => expect(navigate.mock.calls.length).toBe(1));
    expect(navigate.mock.calls[0][0]).toMatch(/\/repeatable\/repeatable:instance:/);

    // FIXME: I have no idea why this doesn't work, it is obviously called, see the very next expect succeeding
    // expect(handle.userPutDeleteMe).toBeCalled();
    const storedRepeatable = handle.userPutDeleteMe.mock.calls[0][0];
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
    let repeatable, template;
    beforeEach(() => {
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
      handle.userPutDeleteMe.mockResolvedValue({ rev: '2-abc' });
    });

    it('redirects when completing a fresh repeatable', async () => {
      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => expect(store.getState().repeatable.doc?.completed).toBeGreaterThan(0));

      store.dispatch(writeComplete('2-abc')); // mocked write

      await waitFor(() => expect(navigate.mock.calls[0][0]).toBe('/'));
    });
    it('doesnt redirect when uncompleting a repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => screen.getByText(/Complete/));
      expect(store.getState().repeatable.doc?.completed).toBeUndefined();

      store.dispatch(writeComplete('2-abc')); // mocked write
      await waitFor(() => expect(store.getState().repeatable.dirty).toBeFalse());
      // it's not clear how to wait to make sure nothing happens here. Ideally we want to know that dirty has caused a rerender

      expect(navigate.mock.calls.length).toBe(0);
    });
    it('doesnt redirect when completing a just uncompleted repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => screen.getByText(/Complete/));
      store.dispatch(writeComplete('2-abc')); // mocked write
      await waitFor(() => expect(store.getState().repeatable.dirty).toBeFalse());
      expect(navigate.mock.calls.length).toBe(0);
      expect(store.getState().repeatable.doc?.completed).toBeUndefined();

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => screen.getByText(/Un-complete/));
      store.dispatch(writeComplete('2-abc')); // mocked write
      await waitFor(() => expect(store.getState().repeatable.dirty).toBeFalse());

      expect(navigate.mock.calls.length).toBe(0);
      expect(store.getState().repeatable.doc?.completed).toBeGreaterThan(0);
    });
    it('does redirect when completing a just uncompleted repeatable if you change something', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable db={handle} />);
      await waitFor(() => screen.getByText(/Something to change/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => screen.getByText(/Complete/));
      store.dispatch(writeComplete('2-abc')); // mocked write
      await waitFor(() => expect(store.getState().repeatable.dirty).toBeFalse());

      expect(store.getState().repeatable.doc?.values[0]).toBeFalsy();
      fireEvent.click(screen.getByText(/Something to change/));
      expect(store.getState().repeatable.doc?.values[0]).toBeTrue();

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => expect(store.getState().repeatable.doc?.completed).toBeGreaterThan(0));
      store.dispatch(writeComplete('2-abc')); // mocked write
      await waitFor(() => expect(store.getState().repeatable.dirty).toBeFalse());

      expect(navigate.mock.calls.length).toBe(1);
      expect(navigate.mock.calls[0][0]).toBe('/');
    });
  });
});
