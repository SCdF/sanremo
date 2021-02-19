import { Box, ListItem, ListItemText } from "@material-ui/core";
import { Link } from "@reach/router";
import { useContext, useEffect, useState } from "react";
import { DbContext } from "../contexts/db";

function ExpandedDetail(props) {
  const EXPAND_BY = 5;
  const { checklist } = props;

  if (!checklist) {
    return null;
  }

  const idx = checklist.items.findIndex(i => !i.checked) - Math.floor(EXPAND_BY / 2);
  const start = Math.max(idx, 0);
  const items = checklist.items.slice(start, start + EXPAND_BY);

  return (
    // TODO: is there a better component to use here?
    <Box>
      {
        // TODO: pull detail lines from Checklist
        // this will make sure checklist items are styled the same etc.
        // ie. expose a checklist line
        items.map(item => {
          const { _id: id, text } = item;
          return <div key={id}>
            <label className='strikethrough'>
              <input type='checkbox' name={id} checked={item.checked} readOnly={true}/>
              {text}
            </label>
          </div>;
        })
    }
    </Box>
  )
}

function ChecklistItem(props) {
  const { checklistStub, expanded } = props;
  const [ checklist, setChecklist ] = useState();

  const db = useContext(DbContext);

  useEffect(() => {
    if (expanded && checklistStub) {
      db.get(checklistStub._id).then(checklist => setChecklist(checklist));
    }
  }, [checklistStub, setChecklist, expanded, db])

  return (
    <Link to={`/checklist/${checklistStub.template}/${checklistStub._id}`}>
      <ListItem>
        <ListItemText
          primary={checklistStub.title}
          secondary={new Date(checklistStub.updated).toISOString()} />
        <ExpandedDetail checklist={checklist} />
      </ListItem>
    </Link>
  );
}

export default ChecklistItem;
