import './App.scss';
import React from 'react';
import { navigate, Router } from "@reach/router"

import CssBaseline from '@material-ui/core/CssBaseline';

import db from './db';

import Page from './components/Page';
import Home from './pages/Home';
import Checklist from './pages/Checklist';
import History from './pages/History';

import { v4 as uuid } from 'uuid';
import About from './pages/About';

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Router>
        <Home db={db} path='/' />
        <About db={db} path='/about' />
        <HackEditor db={db} path='hacks/:id/edit' />
        <Checklist db={db} path='checklist/:checklistId' />
        <History db={db} path='history' />
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
      rawDoc: ''
    }
    this.db = props.db;

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({rawDoc: event.target.value});
  }

  async componentDidMount() {
    const doc = await this.db.get(this.state.id);
    this.setState({rawDoc: JSON.stringify(doc, null, 2)});
  }

  async handleSubmit(event) {
    event.preventDefault();

    const rawDoc = this.state.rawDoc.replace(/<uuid>/g, () => uuid());

    await this.db.put(JSON.parse(rawDoc));

    navigate('/');
  }

  render() {
    return (
      <Page title='Hack document editor' back>
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
