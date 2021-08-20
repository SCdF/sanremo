import { ChangeEvent, Fragment, useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import {
  Button,
  ButtonGroup,
  Checkbox,
  Input,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';
import qs from 'qs';

import { clearRepeatable, clearTemplate, setRepeatable } from '../state/docsSlice';
import { setTemplate } from '../state/docsSlice';
import { set as setContext } from '../state/pageSlice';
import { RootState, useDispatch, useSelector } from '../store';
import { RepeatableDoc, TemplateDoc } from '../../shared/types';
import { Database } from '../db';

const debug = require('debug')('sanremo:client:repeatable');

const slugStyle = makeStyles((theme) => ({
  inputRoot: {
    paddingLeft: '0.5em',
    color: 'inherit',
  },
}));

function Repeatable(props: { db: Database }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const repeatable = useSelector((state) => state.docs.repeatable);
  const template = useSelector((state) => state.docs.template);

  // Used for determining how complete / uncomplete function
  const [initiallyOpen, setInitiallyOpen] = useState(false); // On first load, was the repeatable uncompleted?
  const [edited, setEdited] = useState(false); // Have we made changes to the repeatable

  // Used for auto-focus (hammer spacebar to tick everything and close)
  const [nextIdx, setNextIdx] = useState(undefined as unknown as number); // the next index that the user should focus on
  const [maxIdx, setMaxIdx] = useState(undefined as unknown as number); // the maximum index of fields the user can focus on

  const location = useLocation();

  const { repeatableId } = useParams();
  const { db } = props;

  useEffect(() => {
    async function loadRepeatable() {
      if (repeatableId === 'new') {
        const templateId = qs.parse(location.search, { ignoreQueryPrefix: true })
          .template as string;
        const template: TemplateDoc = await db.get(templateId);

        let created, updated, slug;
        created = updated = Date.now();
        if (['date', 'timestamp'].includes(template.slug.type)) {
          slug = Date.now();
        } else {
          // if (['url', 'string'].includes(template.slug.type)) {
          slug = '';
        }
        const repeatable: RepeatableDoc = {
          _id: `repeatable:instance:${uuid()}`,
          template: templateId,
          values: template.values,
          created,
          updated,
          slug,
        };

        await db.userPut(repeatable);
        navigate(`/repeatable/${repeatable._id}`, { replace: true });
      } else {
        debug('pre repeatable load');
        let repeatable: RepeatableDoc;
        try {
          repeatable = await db.get(repeatableId);
        } catch (error) {
          console.warn(`Repeatable ${repeatableId} failed to load`, error);
          return navigate('/');
        }

        // repeatable.values ??= [];
        repeatable.values = repeatable.values || [];

        let nextIdx = repeatable.values.findIndex((v) => !v);
        if (nextIdx === -1) nextIdx = repeatable.values.length;

        debug('post repeatable load, pre template load');
        const template: TemplateDoc = await db.get(repeatable.template);
        debug('post template load');

        ReactDOM.unstable_batchedUpdates(() => {
          dispatch(
            setContext({
              title: template.title,
              back: true,
              under: 'home',
            })
          );
          dispatch(setRepeatable(repeatable));
          dispatch(setTemplate(template));
          setInitiallyOpen(!repeatable.completed);
          setNextIdx(nextIdx);
        });
      }
    }

    loadRepeatable();
    return () => {
      dispatch(clearRepeatable());
      dispatch(clearTemplate());
    };
  }, [dispatch, db, repeatableId, location, navigate]);

  async function deleteRepeatable() {
    const copy = Object.assign({}, repeatable);

    copy._deleted = true;
    await db.userPut(copy);

    navigate('/');
  }

  async function complete() {
    const copy = Object.assign({}, repeatable);

    copy.completed = Date.now();
    await db.userPut(copy);

    if (edited || initiallyOpen) {
      navigate('/');
    } else {
      dispatch(setRepeatable(copy));
    }
  }

  async function uncomplete() {
    const copy = Object.assign({}, repeatable);

    delete copy.completed;
    await db.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  function handleToggle(idx: number) {
    return async () => {
      const now = Date.now();
      const copy = Object.assign({}, repeatable);
      copy.values = Array.from(copy.values);

      copy.values[idx] = !!!copy.values[idx];

      copy.updated = now;

      await db.userPut(copy);

      ReactDOM.unstable_batchedUpdates(() => {
        setEdited(true);
        dispatch(setRepeatable(copy));
        setNextIdx(copy.values[idx] ? idx + 1 : idx);
      });
    };
  }

  if (!(repeatable && template)) {
    return null;
  }

  if (repeatable?._deleted) {
    navigate('/');
    return null;
  }

  debug(`Render: ${repeatable?._id} | ${template?._id} | ${initiallyOpen}`);

  const items = [];

  const inputValues = repeatable?.values || [];
  const chunks: string[] = template.markdown?.split('\n') || [];
  let lastInputIdx = -1;
  let valueIdx = -1;
  chunks.forEach((chunk, chunkIdx) => {
    if (chunk.trimStart().startsWith('- [ ]')) {
      if (chunkIdx > 0 && lastInputIdx + 1 < chunkIdx) {
        const text = chunks.slice(lastInputIdx + 1, chunkIdx).join('\n');
        items.push(
          <ListItem key={`chunk-${lastInputIdx + 1}-${chunkIdx}`}>
            <ListItemText>
              <ReactMarkdown>{text}</ReactMarkdown>
            </ListItemText>
          </ListItem>
        );
      }

      lastInputIdx = chunkIdx;
      valueIdx++;

      const checked = inputValues[valueIdx];
      const text = chunk.substring(5).trim();

      items.push(
        <ListItem
          key={`value-${valueIdx}`}
          button
          onClick={handleToggle(valueIdx)}
          disabled={!!repeatable?.completed}
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

  const lastChunkIdx = chunks.length - 1;
  if (lastInputIdx !== lastChunkIdx) {
    const text = chunks.slice(lastInputIdx + 1).join('\n');
    items.push(
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

  // There is actually an autoFocus property on button, but it doesn't work.
  // Instead, this is the current workaround. See the following workaround:
  // https://github.com/mui-org/material-ui/issues/3008#issuecomment-284223777
  class CompleteButton extends React.Component {
    componentDidMount() {
      if (nextIdx === maxIdx) {
        //@ts-ignore
        ReactDOM.findDOMNode(this.button).focus();
      }
    }

    render() {
      return (
        <Button
          onClick={complete}
          color="primary"
          variant="contained"
          //@ts-ignore
          ref={(node) => (this.button = node)}
        >
          Complete
        </Button>
      );
    }
  }

  debug('chunks computed, ready to render');

  return (
    <Fragment>
      <List>{items}</List>
      <ButtonGroup>
        {!repeatable?.completed && <CompleteButton />}
        {repeatable?.completed && (
          <Button onClick={uncomplete} color="primary" variant="contained">
            Un-complete
          </Button>
        )}
        <Button onClick={deleteRepeatable}>
          <DeleteIcon />
        </Button>
      </ButtonGroup>
    </Fragment>
  );
}

function RepeatableSlug(props: { db: Database }) {
  const classes = slugStyle();
  const dispatch = useDispatch();

  const { db } = props;

  const repeatable = useSelector((state) => state.docs.repeatable);
  const template = useSelector((state) => state.docs.template);

  function changeSlug({ target }: ChangeEvent) {
    const copy = Object.assign({}, repeatable);
    // @ts-ignore FIXME: check if nodeValue works
    const targetValue = target.value;
    const value = ['date', 'timestamp'].includes(template!.slug.type)
      ? new Date(targetValue).getTime()
      : targetValue;

    copy.slug = value;

    dispatch(setRepeatable(copy));
  }

  async function storeSlugChange() {
    const copy = Object.assign({}, repeatable);

    await db.userPut(copy);
    dispatch(setRepeatable(copy));
  }

  if (!(repeatable && template)) {
    return null;
  }

  let slug;
  if (['url', 'string'].includes(template.slug.type)) {
    slug = (
      <Input
        type="text"
        classes={{ root: classes.inputRoot }}
        placeholder={template.slug.placeholder}
        value={repeatable.slug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('date' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(repeatable.slug);
    const awkwardlyFormattedSlug = [
      slugDate.getFullYear(),
      (slugDate.getMonth() + 1 + '').padStart(2, '0'),
      (slugDate.getDate() + '').padStart(2, '0'),
    ].join('-');

    slug = (
      <Input
        type="date"
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  } else if ('timestamp' === template.slug.type) {
    // FIXME: Clean This Up! The format required for the native date input type cannot
    // be manufactured from the native JavaScript date type. If we were in raw HTML
    // we could post-set it with Javascript by using valueAsNumber, but not in situ
    const slugDate = new Date(repeatable.slug);
    const awkwardlyFormattedSlug =
      [
        slugDate.getFullYear(),
        (slugDate.getMonth() + 1 + '').padStart(2, '0'),
        (slugDate.getDate() + '').padStart(2, '0'),
      ].join('-') +
      'T' +
      [
        (slugDate.getHours() + '').padStart(2, '0'),
        (slugDate.getMinutes() + '').padStart(2, '0'),
      ].join(':');

    slug = (
      <Input
        type="datetime-local"
        classes={{ root: classes.inputRoot }}
        value={awkwardlyFormattedSlug}
        onChange={changeSlug}
        onBlur={storeSlugChange}
      />
    );
  }

  return (
    <div>
      {template.title}
      <i> for </i>
      {slug}
    </div>
  );
}
RepeatableSlug.relevant = (state: RootState) => {
  return state.docs.repeatable && state.docs.template;
};

export { RepeatableSlug };
export default Repeatable;
