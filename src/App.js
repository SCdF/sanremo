import './App.scss';
import React from 'react';
import { Router, Link } from "@reach/router"

import PouchDB from "pouchdb";
import pdbFind from "pouchdb-find";
import { v4 as uuid } from 'uuid';

PouchDB.plugin(pdbFind);

const db = new PouchDB('sanremo');

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
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '20x rotate CW' },
        { _id: uuid(), text: '20x rotate CCW' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s ball squeeze' },
        { _id: uuid(), text: '10x10s band stretch' },
        { _id: uuid(), text: '10x10s band stretch' },
        { _id: uuid(), text: '10x10s band stretch' },
      ]
    },
    {
      _id: `checklist:template:${uuid()}`,
      title: 'Before you push to Github',
      items: [
        { _id: uuid(), text: 'Does ESLint pass?' },
        { _id: uuid(), text: 'Have you covered your new functionality with unit tests?' },
        { _id: uuid(), text: 'How about integration tests?' },
      ]
    }]

    db.bulkDocs(TEMP_DATA);
  };

})();
// TEMP data check

function Home(props) {
  // TODO: create and redirect
  // It would be cleaner for Home to not know how to name checklists
  const items = props.templates.map(template => 
    <li key={template._id}><Link to={`/checklist/${template._id}/checklist:instance:${uuid()}`}>
      {template.title}
    </Link></li>
  );

 return <ul className='App-checklist-list'>{items}</ul>;
};

class Checklist extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      templateId: props.templateId,
      checklistId: props.checklistId,
      checklist: {}
    };
  }

  componentDidMount() {
    db.get(this.state.checklistId)
      .catch(err => {
        if (err.status !== 404) {
          throw err;
        }

        return db.get(this.state.templateId)
          .then(template => {
            const checklist = {
              _id: this.state.checklistId,
              created: Date.now(),
              items: template.items
            };

            return db.put(checklist)
              .then(({rev}) => {
                checklist._rev = rev;
                return checklist;
              })
          });
      })
      .then(checklist => {
        this.setState({checklist});
      });
  }

  render() {
    let items = [];
    if (this.state.checklist && this.state.checklist.items) {
      items = this.state.checklist.items.map(item => {
        const {_id: id, text} = item;
        return <li key={id}>
          <input type='checkbox' name={id} id={id}></input>
          <label htmlFor={id} className='strikethrough'>{text}</label>
        </li>
      });
    }

    return <div>
      <header>{this.state.checklist && this.state.checklist.title}</header>
      <ol>{items}</ol>
    </div>;
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      templates: [],
      activeChecklists: [] // TODO
    };
  }

  componentDidMount() {
    db.find({
        selector: {_id: {$gt: 'checklist:template:'}},
        fields: ['_id', 'title']
      })
      .then(({docs}) => this.setState({templates: docs}));
  }

  render() {   
    return (
      <div className='App'>
        <header className='App-header'>
          <Link to='/'>Sanremo</Link>
        </header>
        <Router>
          <Home path='/' templates={this.state.templates} />
          <Checklist path='checklist/:templateId/:checklistId'/>
        </Router>
      </div>
    );   
  }
}

export default App;
