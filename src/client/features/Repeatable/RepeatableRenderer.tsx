import { Checkbox, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import debugModule from 'debug';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const debug = debugModule('sanremo:client:repeatable:render');

type RepeatableProps = {
  markdown: string;
  values: any[];
  changeValue?: (idx: number) => void;
  hasFocus: (hasFocus: boolean) => void;
};

// TODO: check how wildly expensive this is to render and optimise it
// (it would be great if this only re-rendered if the markdown changed)
function RepeatableRenderer(props: RepeatableProps) {
  const { markdown, values, changeValue, hasFocus } = props;

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

  useEffect(() => {
    if (nextIdx !== undefined && maxIdx !== undefined) {
      hasFocus(nextIdx < maxIdx);
    }
  }, [hasFocus, maxIdx, nextIdx]);

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
  const markdownChunks: string[] = markdown?.split('\n') || [];
  debug(`splitting into ${markdownChunks.length} markdown chunks`);

  let lastInputIdx = -1;
  let valueIdx = -1;
  markdownChunks.forEach((chunk, chunkIdx) => {
    chunk = chunk.trim();
    if (chunk.startsWith('- [ ]')) {
      if (chunkIdx > 0 && lastInputIdx + 1 < chunkIdx) {
        const text = markdownChunks.slice(lastInputIdx + 1, chunkIdx).join('\n');
        renderedChunks.push(
          <ListItem key={`chunk-${lastInputIdx + 1}-${chunkIdx}`}>
            <ListItemText>
              <ReactMarkdown>{text}</ReactMarkdown>
            </ListItemText>
          </ListItem>
        );
      }

      lastInputIdx = chunkIdx;
      valueIdx++;

      const checked = values[valueIdx];
      const text = chunk.substring(5);

      renderedChunks.push(
        <ListItem
          key={`value-${valueIdx}`}
          button
          onClick={handleChange(valueIdx)}
          disabled={!changeValue}
          autoFocus={valueIdx === nextIdx}
        >
          <ListItemIcon>
            <Checkbox checked={!!checked} edge="start" tabIndex={-1} />
          </ListItemIcon>
          <ListItemText>
            <ReactMarkdown renderers={{ paragraph: 'span' }}>{text}</ReactMarkdown>
          </ListItemText>
        </ListItem>
      );
    }
  });

  const lastChunkIdx = markdownChunks.length - 1;
  if (lastInputIdx !== lastChunkIdx) {
    const text = markdownChunks.slice(lastInputIdx + 1).join('\n');
    renderedChunks.push(
      <ListItem key={`chunk-${lastInputIdx + 1}-∞`}>
        <ListItemText>
          <ReactMarkdown>{text}</ReactMarkdown>
        </ListItemText>
      </ListItem>
    );
  }

  if (valueIdx + 1 !== maxIdx) {
    setMaxIdx(valueIdx + 1);
  }

  return <List>{renderedChunks}</List>;
}

export default RepeatableRenderer;
