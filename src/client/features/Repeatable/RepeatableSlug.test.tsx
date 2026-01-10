import type { EnhancedStore } from '@reduxjs/toolkit';
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type RepeatableDoc, SlugType, type TemplateDoc } from '../../../shared/types';
import { setRepeatable, setTemplate } from '../../state/docsSlice';
import { createStore, type RootState } from '../../store';
import { withStore, render as wrappedRender } from '../../test-utils';
import { setUserAsLoggedIn } from '../User/userSlice';
import { RepeatableSlug } from './RepeatableSlug';

vi.mock('../../db');

describe('RepeatableSlug slug types', () => {
  const user = { id: 1, name: 'Tester Test' };
  // biome-ignore lint/suspicious/noExplicitAny: FIXME type this stuff right
  let repeatable: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: FIXME type this stuff right
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
  function render(children: ReactElement) {
    wrappedRender(withStore(store, children));
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
          // @ts-expect-error
          repeatable: { _id: 'abc' },
          // @ts-expect-error
          template: {
            _id: 'def',
            slug: { type: SlugType.Date },
          },
        },
      }),
    ).toBeTruthy();
  });
  it('is not relevant if the template has no slug', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-expect-error
          repeatable: { _id: 'abc' },
          // @ts-expect-error
          template: {
            _id: 'def',
          },
        },
      }),
    ).toBeFalsy();
  });
  it('is not relevant if there is no repeatable', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-expect-error
          template: {
            _id: 'def',
            slug: { type: SlugType.Date },
          },
        },
      }),
    ).toBeFalsy();
  });
  it('is not relevant if there is no template', () => {
    expect(
      RepeatableSlug.relevant({
        docs: {
          // @ts-expect-error
          repeatable: { _id: 'abc' },
        },
      }),
    ).toBeFalsy();
  });
});
