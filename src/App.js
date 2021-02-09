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

const Home = (props) => {
  const items = props.checklists.map(checklist => 
    <li key={checklist._id}><Link to={`/checklist/${checklist._id}/new`}>{checklist.title}</Link></li>
  );

 return <ul className='App-checklist-list'>{items}</ul>;
};

class ChecklistInstance extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      id: props.checklistId,
      checklist: {}
    };
  }

  componentDidMount() {
    db.get(this.state.id)
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
      checklists: [],
    };
  }

  componentDidMount() {
    db.find({
        selector: {_id: {$gt: 'checklist:template:'}},
        fields: ['_id', 'title']
      })
      .then(({docs}) => this.setState({checklists: docs}));
  }

  render() {   
    return (
      <div className='App'>
        <header className='App-header'>
          <Link to='/'>Sanremo</Link>
        </header>
        <Router>
          <Home path='/' checklists={this.state.checklists} />
          <ChecklistInstance path='checklist/:checklistId/new'/>
        </Router>
      </div>
    );   
  }
}

export default App;
