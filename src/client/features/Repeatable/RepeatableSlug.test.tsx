import { EnhancedStore } from '@reduxjs/toolkit';
import { render as renderRtl, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { RepeatableDoc, SlugType, TemplateDoc } from '../../../shared/types';
import { createStore, RootState } from '../../store';
import { setRepeatable, setTemplate } from '../../state/docsSlice';
import { RepeatableSlug } from './RepeatableSlug';
import { setUserAsLoggedIn } from '../User/userSlice';

jest.mock('../../db');

describe('RepeatableSlug slug types', () => {
  const user = { id: 1, name: 'Tester Test' };
  let repeatable: Record<string, any>;
  let template: Record<string, any>;
  let store: EnhancedStore<RootState>;
  beforeEach(() => {
    repeatable = {
      _id: 'abc',
      created: 0,
      updated: 0,
      template: 'def',
      values: [],
    };
    template = {
      _id: 'def',
      created: 0,
      updated: 0,
      values: [],
      title: 'test',
      markdown: '',
    };
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user }));
  });
  function render(children: JSX.Element) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  it('string', async () => {
    repeatable.slug = 'test value';
    template.slug = {
      type: SlugType.String,
      placeholder: 'test placeholder',
    };
    store.dispatch(setRepeatable(repeatable as RepeatableDoc));
    store.dispatch(setTemplate(template as TemplateDoc));

    render(<RepeatableSlug />);

    const input = screen.getByRole('textbox');
    expect(input.getAttribute('placeholder')).toBe('test placeholder');
    expect(input.getAttribute('value')).toBe('test value');
  });
  it('url', async () => {
    repeatable.slug = 'https//example.org';
    template.slug = {
      type: SlugType.URL,
      placeholder: 'test placeholder',
    };
    store.dispatch(setRepeatable(repeatable as RepeatableDoc));
    store.dispatch(setTemplate(template as TemplateDoc));

    render(<RepeatableSlug />);

    const input = screen.getByRole('textbox');
    expect(input.getAttribute('placeholder')).toBe('test placeholder');
    expect(input.getAttribute('value')).toBe('https//example.org');
  });
  it('date', async () => {
    repeatable.slug = new Date(2020, 10, 10).getTime();
    template.slug = {
      type: SlugType.Date,
    };
    store.dispatch(setRepeatable(repeatable as RepeatableDoc));
    store.dispatch(setTemplate(template as TemplateDoc));

    render(<RepeatableSlug />);

    const input = screen.getByRole('entry');
    expect(input.getAttribute('value')).toBe('2020-11-10');
  });
  it('datetime', async () => {
    repeatable.slug = new Date(2020, 10, 10, 12, 13).getTime();
    template.slug = {
      type: SlugType.Timestamp,
    };
    store.dispatch(setRepeatable(repeatable as RepeatableDoc));
    store.dispatch(setTemplate(template as TemplateDoc));

    render(<RepeatableSlug />);

    const input = screen.getByRole('entry');
    expect(input.getAttribute('value')).toBe('2020-11-10T12:13');
  });
});

describe('relevance', () => {
  it('is relevant if it has a repeatable and a template', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-ignore
          repeatable: { _id: 'abc' },
          // @ts-ignore
          template: {
            _id: 'def',
            slug: { type: SlugType.Date },
          },
        },
      })
    ).toBeTruthy();
  });
  it('is not relevant if the template has no slug', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-ignore
          repeatable: { _id: 'abc' },
          // @ts-ignore
          template: {
            _id: 'def',
          },
        },
      })
    ).toBeFalsy();
  });
  it('is not relevant if there is no repeatable', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-ignore
          template: {
            _id: 'def',
            slug: { type: SlugType.Date },
          },
        },
      })
    ).toBeFalsy();
  });
  it('is not relevant if there is no template', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-ignore
          repeatable: { _id: 'abc' },
        },
      })
    ).toBeFalsy();
  });
});