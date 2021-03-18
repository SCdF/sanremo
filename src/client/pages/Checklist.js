import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { navigate, useLocation } from "@reach/router";

import { Button, ButtonGroup, Checkbox, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';

import { v4 as uuid } from 'uuid';
import qs from 'qs';

import Page from '../components/Page';

function Checklist(props) {
  const [checklist, setChecklist] = useState({});
  const [initiallyOpen, setInitiallyOpen] = useState(false);
  const [edited, setEdited] = useState(false);

  const location = useLocation();

  const { checklistId, db } = props;

  useEffect(() => {
    if (checklistId === 'new') {
      const templateId = qs.parse(location.search, { ignoreQueryPrefix: true }).template;
      db.get(templateId)
        .then(template => {
          const checklist = Object.assign({}, template);
          checklist._id = `checklist:instance:${uuid()}`;
          checklist.template = template._id;
          delete checklist._rev;
          checklist.created = checklist.updated = Date.now();

          return db.put(checklist);
        })
        .then(({id}) => navigate(`/checklist/${id}`, {replace: true}));
    } else {
      db.get(checklistId)
        .then(checklist => {
          setChecklist(checklist);
          setInitiallyOpen(!checklist.completed);
        });
    }
  }, [db, checklistId, location]);

  async function deleteChecklist() {
    await db.remove(checklist);

    navigate('/');
  }

  async function completeChecklist() {
    const copy = Object.assign({}, checklist);

    copy.completed = Date.now();
    const { rev } = await db.put(copy);

    if (edited || initiallyOpen) {
      navigate('/');
    } else {
      copy._rev = rev;
      setChecklist(copy);
    }
  }

  async function uncompleteChecklist() {
    const copy = Object.assign({}, checklist);

    delete copy.completed;
    const { rev } = await db.put(copy);
    copy._rev = rev;
    setChecklist(copy);
  }

  function handleToggle(id) {
    const idx = checklist.items.findIndex(i => i._id === id);

    return async () => {
      setEdited(true);

      const now = Date.now();
      const copy = Object.assign({}, checklist);
      const item = Object.assign({}, checklist.items[idx]);
      copy.items[idx] = item;

      item.checked = !item.checked;
      copy.updated = now;

      const { rev } = await db.put(copy);
      copy._rev = rev;

      setChecklist(copy);
    };
  }

  let items = [];
  if (checklist.items) {

    // FIXME: this works, but not always visually. Work out why
    // Works: space bar, full reload
    // Fails: Navigating into a list, clicking with the mouse
    // Browsers: Chrome, Edge (fine on FF)
    // TODO: consider using seleted against ListItem to show next focus
    // TODO: improve rules for focus:
    //  - on item completion move focus to *next* incomplete item, or complete button if at end
    //  - (^ consider: when at end go back to any existing incomplete items?)
    //  - on load set to first incomplete item
    const initialFocus = checklist.items.find(({checked, type}) => (!type || type === 'checkbox') && !!!checked);

    items = checklist.items.map(item => {
      const { _id: id, text, checked, type } = item;

      // TODO: consider splitting these out into components
      if (type === 'note') {
        return (
          <ListItem key={id}>
            <ListItemText>
              <ReactMarkdown className='rich'>{text}</ReactMarkdown>
            </ListItemText>
          </ListItem>
        );
      }

      // if (!type || type === 'checkbox') {
      return (
        <ListItem
          key={id} button disableRipple
          onClick={handleToggle(id)}
          disabled={!!checklist.completed}
          autoFocus={item === initialFocus}>

          <ListItemIcon>
            <Checkbox checked={!!checked} edge='start' tabIndex='-1'/>
          </ListItemIcon>
          <ListItemText primary={text} />
        </ListItem>
      );
      // }
    });
  }

  return (
    <Page title={checklist?.title} back under='home'>
      <List dense>{items}</List>
      <ButtonGroup>
        {!checklist.completed && <Button onClick={completeChecklist} color='primary' variant='contained'>Complete</Button>}
        {checklist.completed && <Button onClick={uncompleteChecklist} color='primary' variant='contained'>Un-complete</Button>}
        <Button onClick={deleteChecklist}><DeleteIcon /></Button>
      </ButtonGroup>
    </Page>
  );
}

export default Checklist;