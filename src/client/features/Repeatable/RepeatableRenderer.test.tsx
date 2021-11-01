import { fireEvent, render as renderRtl, screen } from '@testing-library/react';
import RepeatableRenderer from './RepeatableRenderer';
import { Provider } from 'react-redux';
import { createStore, RootState } from '../../store';
import { AnyAction, Store } from 'redux';
import { setRepeatable, setTemplate } from '../../state/docsSlice';

const NOOP = () => {};

describe('Repeatable Renderer', () => {
  let store: Store<RootState, AnyAction>;

  beforeEach(() => {
    store = createStore();
  });

  function render(children: React.ReactElement) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  function partials(template: Record<string, any>, repeatable: Record<string, any>) {
    // @ts-ignore
    store.dispatch(setTemplate(template));
    // @ts-ignore
    store.dispatch(setRepeatable(repeatable));
  }

  it('renders nothing at all', async () => {
    partials({ markdown: '' }, { values: [] });

    // chunk(0-0)
    render(<RepeatableRenderer hasFocus={NOOP} />);

    const list = await screen.findByRole('list');
    expect(list.innerText).toBeUndefined();
  });
  it('renders a block of markdown', async () => {
    partials({ markdown: 'hello there' }, { values: [] });

    render(<RepeatableRenderer hasFocus={NOOP} />);

    await screen.findByText('hello there');
  });
  // okay let's presume the markdown renderer we didn't write works

  describe('checkboxes', () => {
    it('renders a single unchecked checkbox', async () => {
      partials({ markdown: '- [ ] check me' }, { values: [] });

      render(<RepeatableRenderer hasFocus={NOOP} onChange={() => NOOP()} />);

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeFalsy();
      await screen.findByText('check me');
    });
    it('renders a single checked checkbox', async () => {
      partials({ markdown: '- [ ] check me' }, { values: [true] });
      render(<RepeatableRenderer hasFocus={NOOP} onChange={() => NOOP()} />);

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeTruthy();
      await screen.findByText('check me');
    });
    it('onChange fires when a checkbox is clicked', async () => {
      partials({ markdown: '- [ ] check me' }, { values: [] });
      const onChange = jest.fn();
      render(<RepeatableRenderer hasFocus={NOOP} onChange={onChange} />);

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;

      fireEvent.click(cb);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(0);
    });
    it('onChange fires to the right checkbox when it is clicked', async () => {
      partials({ markdown: '- [ ] do not check me\n- [ ] check me instead' }, { values: [] });
      const onChange = jest.fn();
      render(<RepeatableRenderer hasFocus={NOOP} onChange={onChange} />);

      const cbs: HTMLInputElement[] = (await screen.findAllByRole(
        'checkbox'
      )) as HTMLInputElement[];

      fireEvent.click(cbs[1]);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(1);
    });
  });
});
