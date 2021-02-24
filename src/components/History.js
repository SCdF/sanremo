import { List } from "@material-ui/core";
import { useContext, useEffect, useState } from "react";
import { DbContext } from "../contexts/db";
import ChecklistItem from "./ChecklistItem";
import Page from "./Page";

export default function History() {
  const db = useContext(DbContext);

  const [checklists, setChecklists] = useState([]);

  useEffect(() => db.find({
    selector: {
      _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
      completed: {$exists: true}
    },
    fields: ['_id', 'title', 'completed', 'updated'],
    // sort: [{updated: 'desc'}]
  }).then(({docs}) => setChecklists(docs.sort((d1, d2) => d2.completed - d1.completed ))), [db]);

  const checklistList = checklists.map(checklist =>
    <ChecklistItem key={checklist._id} checklistStub={checklist} />
  );

  return (
    <Page title='History' under='history'>
      <List>
        {checklistList}
      </List>
    </Page>
  )
}
