import { Checkbox, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { debugClient } from '../../globals';
import { useDispatch, useSelector } from '../../store';
import { toggleValue } from './repeatableSlice';

const debug = debugClient('repeatable', 'render');

type RepeatableProps = {
  onChange?: () => void;
  /** whether the auto focus is inside the markdown document. Will never be called if takesFocus is false */
  hasFocus?: (hasFocus: boolean) => void;
  /** whether we are in focus grabbing mode. Default false */
  takesFocus?: boolean;
  initialFocusIdx?: number;
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
  onChange: (idx: number, value: any) => void;
  valueIdx: number;
  disabled: boolean;
  focused: boolean;
  text: string;
};
const MarkdownCheckbox = React.memo((props: MarkdownCheckboxType) => {
  const { onChange: parentOnChange, valueIdx, disabled, focused, text } = props;
  const dispatch = useDispatch();

  const value = useSelector((state) => state.repeatable.doc?.values[valueIdx]);

  function onChange() {
    dispatch(toggleValue({ idx: valueIdx, now: Date.now() }));
    parentOnChange(valueIdx, value);
  }

  return (
    <ListItem button onClick={onChange} disabled={disabled} autoFocus={focused}>
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
  const { onChange: parentOnChange, hasFocus: hasFocusCb, takesFocus, initialFocusIdx } = props;

  const markdown = useSelector((state) => state.template.doc?.markdown);

  // Used for auto-focus (hammer spacebar to tick everything and close)
  const [nextIdx, setNextIdx] = useState(initialFocusIdx); // the next index that the user should focus on
  const [maxIdx, setMaxIdx] = useState(undefined as unknown as number); // the maximum index of fields the user can focus on

  // Caching this value internally
  const [hasFocus, setHasFocus] = useState(true);

  useEffect(() => {
    if (takesFocus && hasFocusCb && nextIdx !== undefined && maxIdx !== undefined) {
      const newHasFocus = nextIdx < maxIdx;
      if (newHasFocus !== hasFocus) {
        hasFocusCb(newHasFocus);
        setHasFocus(newHasFocus);
      }
    }
  }, [hasFocus, hasFocusCb, maxIdx, nextIdx, takesFocus]);

  const handleChange = useCallback(
    (idx: number, currentValue: boolean) => {
      if (parentOnChange) {
        parentOnChange();
        // Toggling a checkbox, with true -> false not advancing focus
        setNextIdx(currentValue ? idx : idx + 1);
      }
    },
    [parentOnChange]
  );

  const [renderables, setRenderables] = useState([] as Renderable[]);
  useEffect(() => {
    debug('markdown render compilation start');
    const result = [] as Renderable[];
    const markdownChunks: string[] = markdown?.split('\n').map((s) => s.trim()) || [];
    debug(`splitting into ${markdownChunks.length} markdown chunks`);

    let lastChunkIdxWithInput = -1; // tracking the last time we say an input (eg checkbox)
    let valueIdx = 0; // tracking which input we're up to
    markdownChunks.forEach((chunk, chunkIdx) => {
      // we have found a custom piece of markdown: a checkbox!
      if (chunk.startsWith('- [ ]')) {
        // if we are neither at the very start nor directly after an input there will be markdown to render
        // between the last time we rendered a custom input and now
        if (chunkIdx > 0 && lastChunkIdxWithInput + 1 < chunkIdx) {
          const text = markdownChunks.slice(lastChunkIdxWithInput + 1, chunkIdx).join('\n');
          result.push({
            type: 'markdown',
            start: lastChunkIdxWithInput + 1,
            end: chunkIdx - 1,
            text,
          });
        }

        lastChunkIdxWithInput = chunkIdx;

        const text = chunk.substring(5); // - [ ]

        result.push({ type: 'checkbox', valueIdx, chunkIdx, text });

        valueIdx++;
      }
    });

    // If there were subsequent markdown chunks after the last input render them
    const lastChunkIdx = markdownChunks.length - 1;
    if (lastChunkIdxWithInput !== lastChunkIdx) {
      const text = markdownChunks.slice(lastChunkIdxWithInput + 1).join('\n');
      result.push({ type: 'markdown', start: lastChunkIdxWithInput + 1, end: lastChunkIdx, text });
    }

    setMaxIdx(valueIdx);
    setRenderables(result);

    debug('postrender');
  }, [markdown]);

  const renderedChunks = [];
  for (let renderable of renderables) {
    if (renderable.type === 'markdown') {
      renderedChunks.push(
        <MarkdownChunk
          key={`chunk(${renderable.start}-${renderable.end})`}
          text={renderable.text}
        />
      );
    } else {
      renderedChunks.push(
        <MarkdownCheckbox
          key={`value[${renderable.valueIdx}]chunk(${renderable.chunkIdx})`}
          onChange={handleChange}
          valueIdx={renderable.valueIdx}
          disabled={!parentOnChange}
          focused={!!takesFocus && renderable.valueIdx === nextIdx}
          text={renderable.text}
        />
      );
    }
  }
  return <List disablePadding>{renderedChunks}</List>;
}

export default RepeatableRenderer;
