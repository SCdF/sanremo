import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../test-utils';
import RepeatableRenderer from './RepeatableRenderer';

const NOOP = () => {};

describe('Repeatable Renderer', () => {
  it('renders nothing at all', async () => {
    // chunk(0-0)
    render(<RepeatableRenderer hasFocus={NOOP} markdown={''} values={[]} />);

    const list = await screen.findByRole('list');
    expect(list.innerText).toBeUndefined();
  });
  it('renders a block of markdown', async () => {
    render(<RepeatableRenderer hasFocus={NOOP} markdown={'hello there'} values={[]} />);

    await screen.findByText('hello there');
  });
  // okay let's presume the markdown renderer we didn't write works

  describe('checkboxes', () => {
    it('renders a single unchecked checkbox', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me'}
          values={[]}
          onChange={() => NOOP()}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeFalsy();
      await screen.findByText('check me');
    });
    it('renders a single checked checkbox', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me'}
          values={[true]}
          onChange={() => NOOP()}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeTruthy();
      await screen.findByText('check me');
    });
    it('onChange fires when a checkbox is clicked', async () => {
      const onChange = jest.fn();
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me'}
          values={[]}
          onChange={onChange}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;

      fireEvent.click(cb);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(0);
    });
    it('onChange fires to the right checkbox when it is clicked', async () => {
      const onChange = jest.fn();
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] do not check me\n- [ ] check me instead'}
          values={[]}
          onChange={onChange}
        />,
      );

      const cbs: HTMLInputElement[] = (await screen.findAllByRole(
        'checkbox',
      )) as HTMLInputElement[];

      fireEvent.click(cbs[1]);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(1);
    });
  });
});
