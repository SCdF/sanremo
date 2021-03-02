import { useEffect, useState } from "react";
import { List } from "@material-ui/core";

import Page from "./Page";

import ChecklistListItem from "./ChecklistListItem";

function History(props) {
  const [checklists, setChecklists] = useState([]);

  const { db } = props;

  useEffect(() => db.find({
    selector: {
      _id: {$gt: 'checklist:instance:', $lte: 'checklist:instance:\uffff'},
      completed: {$exists: true}
    },
    fields: ['_id', 'title', 'completed', 'updated'],
    // sort: [{updated: 'desc'}]
  }).then(({docs}) => setChecklists(docs.sort((d1, d2) => d2.completed - d1.completed ))), [db]);

  const checklistList = checklists.map(checklist =>
    <ChecklistListItem key={checklist._id} checklistStub={checklist} />
  );

  return (
    <Page title='History' under='history'>
      <List>
        {checklistList}
      </List>
    </Page>
  )
}

export default History;
