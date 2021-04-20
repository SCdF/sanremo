import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { navigate, useLocation } from "@reach/router";

import { Button, ButtonGroup, Checkbox, Input, List, ListItem, ListItemIcon, ListItemText, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';
import qs from 'qs';

import Page from '../components/Page';

const debug = require('debug')('sanremo:repeatable');

function Repeatable(props) {
  const [repeatable, setRepeatable] = useState({});
  const [template, setTemplate] = useState({});
  const [initiallyOpen, setInitiallyOpen] = useState(false);
  const [edited, setEdited] = useState(false);

  const location = useLocation();

  const { repeatableId, db } = props;

  useEffect(() => {
    async function loadRepeatable() {
      if (repeatableId === 'new') {
        const templateId = qs.parse(location.search, { ignoreQueryPrefix: true }).template;
        const template = await db.get(templateId);

        const repeatable = {
          _id: `repeatable:instance:${uuid()}`,
          template: templateId,
          values: template.values,
        };
        repeatable.created = repeatable.updated = Date.now();
        if (['url', 'string'].includes(template.slug.type)) {
          repeatable.slug = '';
        } else if (['date', 'timestamp'].includes(template.slug.type)) {
          repeatable.slug = Date.now();
        }

        await db.put(repeatable);
        navigate(`/repeatable/${repeatable._id}`, {replace: true});
      } else {
        debug('pre repeatable load');
        const repeatable = await db.get(repeatableId);
        debug('post repeatable load, pre template load');
        const template = await db.get(repeatable.template);
        debug('post template load');

        ReactDOM.unstable_batchedUpdates(() => {
          setRepeatable(repeatable);
          setTemplate(template);
          setInitiallyOpen(!repeatable.completed);
        });
      }
    };

    loadRepeatable();
  }, [db, repeatableId, location]);

  async function deleteRepeatable() {
    const copy = Object.assign({}, repeatable);

    copy._deleted = true;
    await db.put(copy);

    navigate('/');
  }

  async function completeRepeatable() {
    const copy = Object.assign({}, repeatable);

    copy.completed = Date.now();
    const { rev } = await db.put(copy);

    if (edited || initiallyOpen) {
      navigate('/');
    } else {
      copy._rev = rev;
      setRepeatable(copy);
    }
  }

  async function uncompleteRepeatable() {
    const copy = Object.assign({}, repeatable);

    delete copy.completed;
    const { rev } = await db.put(copy);
    copy._rev = rev;
    setRepeatable(copy);
  }

  function handleToggle(idx) {
    return async () => {
      setEdited(true);

      const now = Date.now();
      const copy = Object.assign({}, repeatable);
      copy.values = Array.from(copy.values);

      copy.values[idx] = !!!copy.values[idx];

      copy.updated = now;

      const { rev } = await db.put(copy);
      copy._rev = rev;

      setRepeatable(copy);
    };
  }

  debug(`Render: ${repeatable?._id} | ${template?._id} | ${initiallyOpen}`);

  const items = [];

  const inputValues = repeatable.values;
  const chunks = template.markdown?.split('\n') || [];
  let lastInputIdx = -1;
  let valueIdx = -1;
  chunks.forEach((chunk, chunkIdx) => {
    if (chunk.trimStart().startsWith('- [ ]')) {
      if (chunkIdx > 0 && lastInputIdx + 1 < chunkIdx) {
        const text = chunks.slice(lastInputIdx + 1, chunkIdx).join('\n');
        items.push(
          <ListItem key={`chunk-${lastInputIdx + 1}-${chunkIdx}`}>
            <ListItemText>
              <ReactMarkdown className='rich'>{text}</ReactMarkdown>
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
          key={`value-${valueIdx}`} button disableRipple
          onClick={handleToggle(valueIdx)}
          disabled={!!repeatable.completed}
          autoFocus={false}>

          <ListItemIcon>
            <Checkbox checked={!!checked} edge='start' tabIndex='-1'/>
          </ListItemIcon>
          <ListItemText>
            <ReactMarkdown className='rich'>{text}</ReactMarkdown>
          </ListItemText>
        </ListItem>
      );
    }
  });

  const lastChunkIdx = chunks.length - 1;
  if (lastInputIdx !== lastChunkIdx) {
    const text = chunks.slice(lastInputIdx + 1, lastChunkIdx).join('\n');
    items.push(
      <ListItem key={`chunk-${lastInputIdx + 1}-${lastChunkIdx}`}>
        <ListItemText>
          <ReactMarkdown className='rich'>{text}</ReactMarkdown>
        </ListItemText>
      </ListItem>
    );
  }

  debug('chunks computed, ready to render');

  function changeSlug({target}) {
    const copy = Object.assign({}, repeatable);
    const value = target.type === 'checkbox' ? target.checked : target.value;

    copy.slug = value;

    setRepeatable(copy);
  }

  async function storeSlugChange() {
    const copy = Object.assign({}, repeatable);

    const {rev} = await db.put(copy);
    copy._rev = rev;
    setRepeatable(copy);
  }

  let slug;
  if (['url', 'string'].includes(template?.slug?.type)) {
    slug = <Input
      type="text"
      label={template.slug.label}
      placeholder={template.slug.placeholder}
      value={repeatable.slug}
      onChange={changeSlug}
      onBlur={storeSlugChange}/>
  } else if ('date' === template?.slug?.type) {
    slug = <Input
      type="date"
      label={template.slug.label}
      value={repeatable.slug}
      onChange={changeSlug}
      onBlur={storeSlugChange}/>
  } else if ('timestamp' === template?.slug?.type) {
    slug = <Input
      type="datetime-local"
      label={template.slug.label}
      value={repeatable.slug}
      onChange={changeSlug}
      onBlur={storeSlugChange}/>
  }

  const header = (
     <div>
        {template?.title}
        <i> for</i>
        {slug}
     </div>
  );

  return (
    <Page title={template?.title} header={header} back under='home'>
      <List>{items}</List>
      <ButtonGroup>
        {!repeatable.completed && <Button onClick={completeRepeatable} color='primary' variant='contained'>Complete</Button>}
        {repeatable.completed && <Button onClick={uncompleteRepeatable} color='primary' variant='contained'>Un-complete</Button>}
        <Button onClick={deleteRepeatable}><DeleteIcon /></Button>
      </ButtonGroup>
    </Page>
  );
}

export default Repeatable;
