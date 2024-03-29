import { Checkbox, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { debugClient } from '../../globals';

const debug = debugClient('repeatable', 'render');

export type RepeatableProps = {
  markdown: string;
  values: boolean[];
  onChange?: (idx: number) => void;
  /** whether the auto focus is inside the markdown document. Will never be called if takesFocus is false */
  hasFocus?: (hasFocus: boolean) => void;
  /** whether we are in focus grabbing mode. Default false */
  takesFocus?: boolean;
};

type RenderableMarkdown = {
  type: 'markdown';
  start: number;
  end: number;
  text: string;
};
type RenderableCheckbox = {
  type: 'checkbox';
  valueIdx: number;
  chunkIdx: number;
  text: string;
};
type Renderable = RenderableMarkdown | RenderableCheckbox;

const MarkdownChunk = React.memo((props: { text: string }) => (
  <ListItem>
    <ListItemText>
      <ReactMarkdown>{props.text}</ReactMarkdown>
    </ListItemText>
  </ListItem>
));

type MarkdownCheckboxType = {
  handleChange: (valueIdx: number, value: boolean) => React.MouseEventHandler<HTMLDivElement>;
  valueIdx: number;
  value: boolean;
  disabled: boolean;
  focused: boolean;
  text: string;
};
const MarkdownCheckbox = React.memo((props: MarkdownCheckboxType) => {
  const { handleChange, valueIdx, value, disabled, focused, text } = props;
  return (
    <ListItem
      button
      onClick={handleChange(valueIdx, value)}
      disabled={disabled}
      autoFocus={focused}
    >
      <ListItemIcon>
        <Checkbox checked={!!value} edge="start" tabIndex={-1} />
      </ListItemIcon>
      <ListItemText>
        <ReactMarkdown renderers={{ paragraph: 'span' }}>{text}</ReactMarkdown>
      </ListItemText>
    </ListItem>
  );
});

function RepeatableRenderer(props: RepeatableProps) {
  const { markdown, values, onChange: changeValue, hasFocus: hasFocusCb, takesFocus } = props;

  // Initially auto-select the value AFTER whatever the last entered value is
  // NB: we're going to calculate focus regardless of whether `takesFocus` is true, for readability
  let initialNextIndex = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i]) {
      initialNextIndex = i + 1;
      break;
    }
  }

  // Used for auto-focus (hammer spacebar to tick everything and close)
  const [nextIdx, setNextIdx] = useState(initialNextIndex); // the next index that the user should focus on

  // Caching this value internally
  const [hasFocus, setHasFocus] = useState(true);

  const handleChange = useCallback(
    (idx: number, currentValue: boolean) => {
      // returning the call fn here binds the passed idx
      return () => {
        if (changeValue) {
          changeValue(idx);
          // Toggling a checkbox, with true -> false not advancing focus
          setNextIdx(currentValue ? idx : idx + 1);
        }
      };
    },
    [changeValue],
  );

  debug('markdown render compilation start');
  const renderables = [] as Renderable[];
  const markdownChunks: string[] = markdown?.split('\n').map((s) => s.trim()) || [];
  debug(`splitting into ${markdownChunks.length} markdown chunks`);

  let lastChunkIdxWithInput = -1; // tracking the last time we say an input (eg checkbox)
  let valueIdx = 0; // tracking which input we're up to
  for (const [chunkIdx, chunk] of markdownChunks.entries()) {
    // we have found a custom piece of markdown: a checkbox!
    if (chunk.startsWith('- [ ]')) {
      // if we are neither at the very start nor directly after an input there will be markdown to render
      // between the last time we rendered a custom input and now
      if (chunkIdx > 0 && lastChunkIdxWithInput + 1 < chunkIdx) {
        const text = markdownChunks.slice(lastChunkIdxWithInput + 1, chunkIdx).join('\n');
        renderables.push({
          type: 'markdown',
          start: lastChunkIdxWithInput + 1,
          end: chunkIdx - 1,
          text,
        });
      }

      lastChunkIdxWithInput = chunkIdx;

      const text = chunk.substring(5); // - [ ]

      renderables.push({ type: 'checkbox', valueIdx, chunkIdx, text });

      valueIdx++;
    }
  }

  // If there were subsequent markdown chunks after the last input render them
  const lastChunkIdx = markdownChunks.length - 1;
  if (lastChunkIdxWithInput !== lastChunkIdx) {
    const text = markdownChunks.slice(lastChunkIdxWithInput + 1).join('\n');
    renderables.push({
      type: 'markdown',
      start: lastChunkIdxWithInput + 1,
      end: lastChunkIdx,
      text,
    });
  }
  const maxIdx = valueIdx;
  debug('postrender');

  useEffect(() => {
    if (takesFocus && hasFocusCb && nextIdx !== undefined && maxIdx !== undefined) {
      const newHasFocus = nextIdx < maxIdx;
      if (newHasFocus !== hasFocus) {
        hasFocusCb(newHasFocus);
        setHasFocus(newHasFocus);
      }
    }
  }, [hasFocus, hasFocusCb, maxIdx, nextIdx, takesFocus]);

  const renderedChunks = [];
  for (const renderable of renderables) {
    if (renderable.type === 'markdown') {
      renderedChunks.push(
        <MarkdownChunk
          key={`chunk(${renderable.start}-${renderable.end})`}
          text={renderable.text}
        />,
      );
    } else {
      renderedChunks.push(
        <MarkdownCheckbox
          key={`value[${renderable.valueIdx}]chunk(${renderable.chunkIdx})`}
          handleChange={handleChange}
          valueIdx={renderable.valueIdx}
          value={values[renderable.valueIdx]}
          disabled={!changeValue}
          focused={!!takesFocus && renderable.valueIdx === nextIdx}
          text={renderable.text}
        />,
      );
    }
  }
  return <List disablePadding>{renderedChunks}</List>;
}

export default RepeatableRenderer;
