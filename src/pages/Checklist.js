import React, { useContext, useEffect, useState } from 'react';
import { navigate, useLocation } from "@reach/router";
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import Page from '../components/Page';
import {DbContext} from "../contexts/db";

import { v4 as uuid } from 'uuid';
import qs from 'qs';
import { ButtonGroup } from '@material-ui/core';

export function Checklist(props) {
  const [checklist, setChecklist] = useState({});

  const location = useLocation();

  const { checklistId } = props;

  const db = useContext(DbContext);

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
        .then(({id}) => navigate(`/checklist/${id}`));
    } else {
      db.get(checklistId)
        .then(checklist => setChecklist(checklist));
    }
  }, [db, checklistId, location]);

  async function handleInputChange(e) {
    const item = checklist.items.find(i => i._id === e.target.name);
    // TODO: why does handleInputChange get called twice?
    // Is this me using React incorrectly, or HTML being HTML, or something else?
    if (item.checked !== e.target.checked) {
      const now = Date.now();
      const updatedChecklist = Object.assign({}, checklist);

      item.checked = e.target.checked;
      updatedChecklist.updated = now;

      const { rev } = await db.put(updatedChecklist);
      updatedChecklist._rev = rev;

      setChecklist(updatedChecklist);
    }
  }

  async function deleteChecklist() {
    await db.remove(checklist);

    navigate('/');
  }

  async function completeChecklist() {
    checklist.completed = Date.now();
    await db.put(checklist);

    navigate('/');
  }

  async function uncompleteChecklist() {
    delete checklist.completed;
    await db.put(checklist);

    navigate('/');
  }

  let items = [];
  if (checklist && checklist.items) {
    items = checklist.items.map(item => {
      const { _id: id, text } = item;
      return <li key={id}>
        <label className='strikethrough'>
          <input type='checkbox' name={id} checked={item.checked} onChange={handleInputChange} />
          {text}
        </label>
      </li>;
    });
  }

  return (
    <Page title={checklist && checklist.title} back='/'>
      <ol>{items}</ol>
      <ButtonGroup>
        {!checklist.completed && <Button onClick={completeChecklist} color='primary' variant='contained'>Complete</Button>}
        {checklist.completed && <Button onClick={uncompleteChecklist} color='primary' variant='contained'>Un-complete</Button>}
        <Button onClick={deleteChecklist}><DeleteIcon /></Button>
      </ButtonGroup>
    </Page>
  );
}

export default Checklist;
