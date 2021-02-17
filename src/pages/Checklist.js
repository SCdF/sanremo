import React, { useEffect, useState } from 'react';
import { navigate } from "@reach/router";
import Button from '@material-ui/core/Button';
import Page from '../components/Page';

export function Checklist(props) {
  const [checklist, setChecklist] = useState({});

  const { db } = props;

  async function handleInputChange(e) {
    const item = checklist.items.find(i => i._id === e.target.name);
    // TODO: why does handleInputChange get called twice?
    // Is this me using React incorrectly, or HTML being HTML, or something else?
    if (item.checked !== e.target.checked) {
      const now = Date.now();
      const updatedChecklist = Object.assign({}, checklist);

      item.checked = e.target.checked;
      updatedChecklist.updated = now;

      const completed = updatedChecklist.items.every(i => i.checked);
      if (completed) {
        updatedChecklist.completed = now;
      } else {
        delete updatedChecklist.completed;
      }

      const { rev } = await db.put(updatedChecklist);
      updatedChecklist._rev = rev;

      setChecklist(updatedChecklist);
    }
  }

  async function deleteChecklist() {
    await db.remove(checklist);

    navigate('/');
  }

  useEffect(() => db.get(props.checklistId)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return db.get(props.templateId)
        .then(template => {
          const checklist = Object.assign({}, template);
          checklist._id = props.checklistId;
          checklist.template = template._id;
          delete checklist._rev;
          checklist.created = Date.now();

          return db.put(checklist)
            .then(({ rev }) => {
              checklist._rev = rev;
              return checklist;
            });
        });
    })
    .then(checklist => {
      setChecklist(checklist);
      // TODO I am blindly putting things in this. Read about it!
    }), [db, props.checklistId, props.templateId]);


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
    <Page title={checklist && checklist.title}>
      <header className={checklist.completed && 'strikethrough'}>{checklist && checklist.title}</header>
      <ol>{items}</ol>
      <Button onClick={deleteChecklist} color='primary' variant='contained'>Delete</Button>
    </Page>
  );
}

export default Checklist;