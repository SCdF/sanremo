import type { Store } from '@reduxjs/toolkit';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react/jsx-runtime';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type RepeatableDoc, SlugType, type TemplateDoc } from '../../shared/types';
import { getMockDb, type MockDatabase } from '../db/__mocks__';
import { setUserAsLoggedIn } from '../features/User/userSlice';
import { createStore } from '../store';
import { withStore, render as wrappedRender } from '../test-utils';
import Repeatable from './Repeatable';

vi.mock('react-router-dom', async () => {
  return {
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
    useParams: vi.fn(),
  };
});
vi.mock('../db');

const mockUseNavigate = useNavigate as Mock;
const mockUseLocation = useLocation as Mock;
const mockUseParams = useParams as Mock;

describe('Repeatable', () => {
  const user = { id: 1, name: 'Tester Test' };
  let navigate: Mock;
  let store: Store;
  let handle: MockDatabase;

  beforeEach(() => {
    navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user }));

    handle = getMockDb();
  });

  function render(children: JSX.Element) {
    wrappedRender(withStore(store, children));
  }

  it('renders without crashing', async () => {
    handle.get
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:1234',
        template: 'repeatable:template:5678',
        values: [],
      } satisfies Partial<RepeatableDoc>)
      .mockResolvedValueOnce({
        _id: 'repeatable:template:5678',
        title: 'A Repeatable',
        markdown: 'Some text',
      } satisfies Partial<TemplateDoc>);
    mockUseLocation.mockReturnValue(undefined);
    mockUseParams.mockReturnValue({ repeatableId: '1234' });

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
          type: SlugType.String,
        },
      } satisfies Partial<TemplateDoc>)
      .mockResolvedValueOnce({
        _id: 'repeatable:instance:1234',
        _rev: '42-abc',
        slug: 'test',
        values: [],
      } satisfies Partial<RepeatableDoc>);
    handle.userPut.mockResolvedValue({ _id: '4321' });
    mockUseLocation.mockReturnValue({
      search: '?template=repeatable:template:1234',
    });
    mockUseParams
      .mockReturnValueOnce({ repeatableId: 'new' })
      .mockReturnValue({ repeatableId: '5678' });

    render(<Repeatable />);

    expect(handle.get).toBeCalled();
    expect(handle.get.mock.calls[0][0]).toBe('repeatable:template:1234');

    await waitFor(() => expect(navigate.mock.calls.length).toBe(1));
    expect(navigate.mock.calls[0][0]).toMatch(/\/repeatable\/repeatable:instance:/);

    expect(handle.userPut).toBeCalled();
    const storedRepeatable = handle.userPut.mock.calls[0][0] as RepeatableDoc;
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
    let repeatable: Partial<RepeatableDoc>;
    let template: Partial<TemplateDoc>;

    beforeEach(() => {
      handle.get.mockReset();
      handle.userPut.mockReset();
      mockUseLocation.mockReset();
      mockUseParams.mockReset();

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

      handle.get.mockImplementation((docId: string) => {
        if (docId === 'repeatable:instance:1234') {
          return Promise.resolve(repeatable);
        }
        if (docId === 'repeatable:template:5678') {
          return Promise.resolve(template);
        }
        return Promise.reject(new Error(`Bad ${docId}`));
      });
      mockUseLocation.mockReturnValue(undefined);
      mockUseParams.mockReturnValue({ repeatableId: 'repeatable:instance:1234' });
      handle.userPut.mockResolvedValue({ _id: 'repeatable:instance:1234', _rev: '2-abc' });
    });

    it('redirects when completing a fresh repeatable', async () => {
      render(<Repeatable />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(navigate.mock.calls[0][0]).toBe('/'));
    });
    it('doesnt redirect when uncompleting a repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));

      expect(navigate.mock.calls.length).toBe(0);
      expect((handle.userPut.mock.calls[0][0] as RepeatableDoc).completed).not.toBeTruthy();
    });
    it('doesnt redirect when completing a just uncompleted repeatable', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable />);
      await waitFor(() => screen.getByText(/Some text/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect((handle.userPut.mock.calls[0][0] as RepeatableDoc).completed).not.toBeTruthy();

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(2));
      expect(navigate.mock.calls.length).toBe(0);
      expect((handle.userPut.mock.calls[1][0] as RepeatableDoc).completed).toBeTruthy();
    });
    it('does redirect when completing a just uncompleted repeatable if you change something', async () => {
      repeatable.completed = 123456789;

      render(<Repeatable />);
      await waitFor(() => screen.getByText(/Something to change/));

      fireEvent.click(await waitFor(() => screen.getByText(/Un-complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(1));
      expect(navigate.mock.calls.length).toBe(0);
      expect((handle.userPut.mock.calls[0][0] as RepeatableDoc).completed).not.toBeTruthy();

      fireEvent.click(await waitFor(() => screen.getByText(/Something to change/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(2));

      fireEvent.click(await waitFor(() => screen.getByText(/Complete/)));
      await waitFor(() => expect(handle.userPut.mock.calls.length).toBe(3));
      expect(navigate.mock.calls.length).toBe(1);
      expect((handle.userPut.mock.calls[2][0] as RepeatableDoc).completed).toBeTruthy();
      expect(navigate.mock.calls[0][0]).toBe('/');
    });
  });
});
