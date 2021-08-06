import { fireEvent, render as renderRtl, screen, waitFor } from '@testing-library/react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';

import db from '../db';

import Repeatable from './Repeatable';
import { createStore } from '../store';
import { set as setLoggedInUser } from '../state/userSlice';

jest.mock('react-router-dom');
jest.mock('../db');

describe('Repeatable', () => {
  let navigate;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);
  });

  let store;
  beforeEach(() => {
    store = createStore();
    store.dispatch(setLoggedInUser({ id: 1, name: 'Tester Test' }));
  });

  function render(children) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  it('renders without crashing', async () => {
    db.get.mockResolvedValue({
      title: 'A Repeatable',
      values: [],
    });
    useLocation.mockReturnValue();
    useParams.mockReturnValue({ repeatableId: '1234' });

    render(<Repeatable db={db} />);

    await waitFor(() => screen.getByText(/A Repeatable/));
  });

  it('creates new instance and redirects if "new"', async () => {
    db.get
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
    db.put.mockResolvedValue({ id: '4321' });
    useLocation.mockReturnValue({
      search: '?template=repeatable:template:1234',
    });
    useParams
      // FIXME: I have no idea why I need to do this twice
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValue({ repeatableId: '5678' });

    render(<Repeatable db={db} />);

    expect(db.get).toBeCalled();
    expect(db.get.mock.calls[0][0]).toBe('repeatable:template:1234');
    // FIXME: I have no idea why this doesn't work, it is obviously called, see below
    // expect(db.put).toBeCalled();

    await waitFor(() => expect(navigate.mock.calls.length).toBe(1));
    expect(navigate.mock.calls[0][0]).toMatch(/\/repeatable\/repeatable:instance:/);

    const storedRepeatable = db.put.mock.calls[0][0];
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
    it('redirects when completing a fresh repeatable', async () => {
      db.get.mockResolvedValue({
        title: 'A Repeatable',
        values: [],
      });
      useLocation.mockReturnValue();
      db.put.mockResolvedValue({ rev: '2-abc' });
      useParams.mockReturnValue({ repeatableId: '1234' });

      render(<Repeatable db={db} />);
      await waitFor(() => screen.getByText(/A Repeatable/));

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => expect(navigate.mock.calls[0][0]).toBe('/'));
    });
    it('doesnt redirect when uncompleting a repeatable', async () => {
      db.get.mockResolvedValue({
        title: 'A Repeatable',
        completed: 123456789,
        values: [],
      });
      useLocation.mockReturnValue();
      db.put.mockResolvedValue({ rev: '2-abc' });
      useParams.mockReturnValue({ repeatableId: '1234' });

      render(<Repeatable db={db} />);
      await waitFor(() => screen.getByText(/A Repeatable/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(1));

      expect(navigate.mock.calls.length).toBe(0);
      expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();
    });
    it('doesnt redirect when completing a just uncompleted repeatable', async () => {
      db.get.mockResolvedValue({
        title: 'A Repeatable',
        completed: 123456789,
        values: [],
      });
      useLocation.mockReturnValue();
      db.put.mockResolvedValue({ rev: '2-abc' });
      useParams.mockReturnValue({ repeatableId: '1234' });

      render(<Repeatable db={db} />);
      await waitFor(() => screen.getByText(/A Repeatable/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(2));
      expect(navigate.mock.calls.length).toBe(0);
      expect(db.put.mock.calls[1][0].completed).toBeTruthy();
    });
    it('does redirect when completing a just uncompleted repeatable if you change something', async () => {
      db.get.mockImplementation((docId) => {
        if (docId === '1234') {
          return Promise.resolve({
            template: '5678',
            completed: 123456789,
            values: [false],
          });
        }
        if (docId === '5678') {
          return Promise.resolve({
            title: 'A Repeatable',
            markdown: '- [ ] Something to change',
            values: [false],
          });
        }
      });
      useLocation.mockReturnValue();
      db.put.mockResolvedValue({ rev: '2-abc' });
      useParams.mockReturnValue({ repeatableId: '1234' });

      render(<Repeatable db={db} />);
      await waitFor(() => screen.getByText(/A Repeatable/));

      fireEvent.click(screen.getByText(/Un-complete/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();

      fireEvent.click(screen.getByText(/Something to change/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(2));

      fireEvent.click(screen.getByText(/Complete/));
      await waitFor(() => expect(db.put.mock.calls.length).toBe(3));
      expect(navigate.mock.calls.length).toBe(1);
      expect(db.put.mock.calls[2][0].completed).toBeTruthy();
      expect(navigate.mock.calls[0][0]).toBe('/');
    });
  });
  // TODO: parsing tests
  describe('parsing', () => {
    it.todo('detect checkboxes');
  });
});
