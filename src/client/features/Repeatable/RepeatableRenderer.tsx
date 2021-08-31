import { Checkbox, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import debugModule from 'debug';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const debug = debugModule('sanremo:client:repeatable:render');

type RepeatableProps = {
  markdown: string;
  values: any[];
  onChange?: (idx: number) => void;
  hasFocus: (hasFocus: boolean) => void;
};

const renderMarkdownChunk = (chunkStart: number, chunkEnd: number, text: string) => (
  <ListItem key={`chunk(${chunkStart}-${chunkEnd})`}>
    <ListItemText>
      <ReactMarkdown>{text}</ReactMarkdown>
    </ListItemText>
  </ListItem>
);

// FIXME: this re-runs a non-optimal number of times
function RepeatableRenderer(props: RepeatableProps) {
  const { markdown, values, onChange: changeValue, hasFocus: hasFocusCb } = props;

  // Initially auto-select the value AFTER whatever the last entered value is
  let initialNextIndex = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i]) {
      initialNextIndex = i + 1;
      break;
    }
  }

  // Used for auto-focus (hammer spacebar to tick everything and close)
  const [nextIdx, setNextIdx] = useState(initialNextIndex); // the next index that the user should focus on
  const [maxIdx, setMaxIdx] = useState(undefined as unknown as number); // the maximum index of fields the user can focus on

  // Caching this value internally
  const [hasFocus, setHasFocus] = useState(true);

  useEffect(() => {
    if (nextIdx !== undefined && maxIdx !== undefined) {
      const newHasFocus = nextIdx < maxIdx;
      if (newHasFocus !== hasFocus) {
        hasFocusCb(newHasFocus);
        setHasFocus(newHasFocus);
      }
    }
  }, [hasFocus, hasFocusCb, maxIdx, nextIdx]);

  const handleChange = (idx: number) => {
    // returning the call fn here binds the passed idx
    return () => {
      if (changeValue) {
        changeValue(idx);
        // Toggling a checkbox, with true -> false not advancing focus
        setNextIdx(values[idx] ? idx : idx + 1);
      }
    };
  };

  debug('prerender');
  const renderedChunks = [];
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
        renderedChunks.push(renderMarkdownChunk(lastChunkIdxWithInput + 1, chunkIdx - 1, text));
      }

      lastChunkIdxWithInput = chunkIdx;

      const value = values[valueIdx];
      const text = chunk.substring(5); // - [ ]

      renderedChunks.push(
        <ListItem
          key={`value[${valueIdx}]chunk(${chunkIdx})`}
          button
          onClick={handleChange(valueIdx)}
          disabled={!changeValue}
          autoFocus={valueIdx === nextIdx}
        >
          <ListItemIcon>
            <Checkbox checked={!!value} edge="start" tabIndex={-1} />
          </ListItemIcon>
          <ListItemText>
            <ReactMarkdown renderers={{ paragraph: 'span' }}>{text}</ReactMarkdown>
          </ListItemText>
        </ListItem>
      );

      valueIdx++;
    }
  });

  // If there were subsequent markdown chunks after the last input render them
  const lastChunkIdx = markdownChunks.length - 1;
  if (lastChunkIdxWithInput !== lastChunkIdx) {
    const text = markdownChunks.slice(lastChunkIdxWithInput + 1).join('\n');
    renderedChunks.push(renderMarkdownChunk(lastChunkIdxWithInput + 1, lastChunkIdx, text));
  }

  if (valueIdx !== maxIdx) {
    // We set this once we've parsed out the markdown because we don't trust values.length to just
    // tell us this
    debug(`updating maxIdx from ${maxIdx} to ${valueIdx}`);
    setMaxIdx(valueIdx);
  }

  debug('postrender');

  return <List disablePadding>{renderedChunks}</List>;
}

export default RepeatableRenderer;
