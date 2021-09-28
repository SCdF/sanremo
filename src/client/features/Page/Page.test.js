import { useNavigate } from 'react-router-dom';
import { render as renderRtl, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import Page from './Page';
import { createStore } from '../../store';
import { setUserAsLoggedIn } from '../User/userSlice';
import { set as setPageContext } from './pageSlice';

jest.mock('react-router-dom');
jest.mock('../../db');

describe('Page', () => {
  let navigate;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);
  });

  let store;
  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: { id: 1, name: 'Tester Test' } }));
  });

  function render(children) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  it('renders without crashing', async () => {
    render(<Page />);
  });

  it('sets the title on page and on window', async () => {
    store.dispatch(setPageContext({ title: 'Test Title' }));
    render(<Page />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(global.window.document.title).toBe('Test Title | Sanremo');
  });
});
