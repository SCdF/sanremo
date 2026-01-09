import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { NavigateFunction, useNavigate } from 'react-router-dom';
import { render } from '../../test-utils';

import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import RepeatableListItem from './RepeatableListItem';

vi.mock('react-router-dom');

// FIXME: this test has different date format outputs depending on the computer you're
// running it on
describe('Repeatable', () => {
  let navigate: Mock<NavigateFunction>;
  beforeEach(() => {
    navigate = vi.fn();
    (useNavigate as Mock).mockReturnValue(navigate);
  });

  it('renders without crashing', async () => {
    const params = {
      _id: 'abc',
      timestamp: Date.now(),
      slug: 'http://example.com',
      template: {
        title: 'Checklist ListItem',
        slug: {
          type: 'url',
          label: 'For',
        },
      },
    };

    render(<RepeatableListItem {...params} />);

    expect(screen.getByText('Checklist ListItem')).toBeTruthy();
    expect(screen.getByText('less than a minute ago')).toBeTruthy();
  });

  it('url slug renders (and does not effect slug click)', async () => {
    const params = {
      _id: 'abc',
      timestamp: Date.now(),
      slug: 'http://example.com',
      template: {
        title: 'URL Test',
        slug: {
          type: 'url',
        },
      },
    };

    render(<RepeatableListItem {...params} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', params.slug);
    act(() => {
      userEvent.click(screen.getByText('URL Test'));
    });
    expect(navigate).toBeCalledWith('/repeatable/abc');
  });

  it('date slug', async () => {
    const params = {
      _id: 'abc',
      timestamp: Date.now(),
      slug: new Date(2020, 0, 1).getTime(),
      template: {
        title: 'Date test',
        slug: {
          type: 'date',
        },
      },
    };

    render(<RepeatableListItem {...params} />);
    // Date format is locale-dependent, so check for the expected date in any format
    const expectedDate = new Date(2020, 0, 1).toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeTruthy();
  });

  it('timestamp slug', async () => {
    const params = {
      _id: 'abc',
      timestamp: Date.now(),
      slug: new Date(2020, 0, 1, 10, 20).getTime(),
      template: {
        title: 'Timestamp test',
        slug: {
          type: 'timestamp',
        },
      },
    };

    render(<RepeatableListItem {...params} />);
    // Timestamp format is locale-dependent, so check for the expected timestamp in any format
    const expectedTimestamp = new Date(2020, 0, 1, 10, 20).toLocaleString();
    expect(screen.getByText(expectedTimestamp)).toBeTruthy();
  });
  it('plain text slug', async () => {
    const params = {
      _id: 'abc',
      timestamp: Date.now(),
      slug: 'some text for you',
      template: {
        title: 'Plain Text test',
        slug: {
          type: 'string',
        },
      },
    };

    render(<RepeatableListItem {...params} />);
    expect(screen.getByText('some text for you')).toBeTruthy();
  });
});
