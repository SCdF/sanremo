import { screen } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';

import { createStore } from '../../store';
import { render, withStore } from '../../test-utils';
import { setUserAsLoggedIn } from '../User/userSlice';
import Page from './Page';
import { set as setPageContext } from './pageSlice';

jest.mock('react-router-dom');
jest.mock('../../db');

describe('Page', () => {
  let navigate;
  let store;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);

    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: { id: 1, name: 'Tester Test' } }));
  });

  it('renders without crashing', async () => {
    render(withStore(store, <Page />));
  });

  it('sets the title on page and on window', async () => {
    store.dispatch(setPageContext({ title: 'Test Title' }));
    render(withStore(store, <Page />));

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(global.window.document.title).toBe('Test Title | Sanremo');
  });
});
