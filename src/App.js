import './App.scss';
import React from 'react';
import { navigate, Router } from "@reach/router"

import CssBaseline from '@material-ui/core/CssBaseline';

import Home from './pages/Home';
import { Checklist } from './pages/Checklist';

import { v4 as uuid } from 'uuid';

import PouchDB from "pouchdb";
import pdbFind from "pouchdb-find";
import Page from './components/Page';
PouchDB.plugin(pdbFind);

// FIXME put into context
export const db = new PouchDB('sanremo');

// TEMP data check
(async function() {
  console.log('TEMP data check');
  const templates = await db.find({
    selector: {_id: {$gt: 'checklist:template:'}}
  });

  if (!templates || !templates.docs.length) {
    console.log('No temp data found, adding');
    const TEMP_DATA = [{
      _id: `checklist:template:${uuid()}`,
      title: 'Wrist Stretches',
      items: [
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '20x rotate CW' },
        { _id: uuid(), checked: false, text: '20x rotate CCW' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s ball squeeze' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
        { _id: uuid(), checked: false, text: '10x10s band stretch' },
      ]
    },
    {
      _id: `checklist:template:${uuid()}`,
      title: 'Before you push to Github',
      items: [
        { _id: uuid(), checked: false, text: 'Does ESLint pass?' },
        { _id: uuid(), checked: false, text: 'Have you covered your new functionality with unit tests?' },
        { _id: uuid(), checked: false, text: 'How about integration tests?' },
      ]
    }]

    db.bulkDocs(TEMP_DATA);
  };

})();
// TEMP data check

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Router>
        <Home path='/' db={db}/>
        <HackEditor path='hacks/:id/edit' db={db} />
        {/* 
          do we really want checklists to contain the template id in their url? why? 
          We need them ATM because Checklist creates itself (and so needs the template 
          id to clone), but we should fix that too!
          */}
        <Checklist path='checklist/:templateId/:checklistId' db={db}/>
      </Router>
    </React.Fragment>
  );
}

//TODO: temporary way to edit documents in general, DELETE ME!
class HackEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      db: props.db,
      rawDoc: ''
    } 

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({rawDoc: event.target.value});
  }

  async componentDidMount() {
    const doc = await this.state.db.get(this.state.id);
    this.setState({rawDoc: JSON.stringify(doc, null, 2)});
  }

  async handleSubmit(event) {
    event.preventDefault();

    const rawDoc = this.state.rawDoc.replace(/<uuid>/g, () => uuid());

    await this.state.db.put(JSON.parse(rawDoc));

    navigate('/');
  }

  render() {
    return (
      <Page title='Hack document editor' back='/'>
        <form onSubmit={this.handleSubmit}>        
        <label>Raw Template:<br/>
          <textarea style={{width: '100%', height: '20em'}} type="text" value={this.state.rawDoc} onChange={this.handleChange} />        
        </label>
        <br/>
        <input type="submit" value="Submit" />
      </form>
      </Page>
    );
  }
}

export default App;
