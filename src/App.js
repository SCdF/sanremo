import './App.scss';
import React from 'react';
import { navigate, Router } from "@reach/router"

import CssBaseline from '@material-ui/core/CssBaseline';

import Home from './pages/Home';
import { Checklist } from './pages/Checklist';

import { v4 as uuid } from 'uuid';

import Page from './components/Page';

import {DbContext, db} from './contexts/db';

function App() {
  return (
    <DbContext.Provider value={db}>
      <CssBaseline />
      <Router>
        <Home path='/' />
        <HackEditor path='hacks/:id/edit' />
        <Checklist path='checklist/:checklistId' />
      </Router>
    </DbContext.Provider>
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

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  static contextType = DbContext;

  handleChange(event) {
    this.setState({rawDoc: event.target.value});
  }

  async componentDidMount() {
    const doc = await this.context.get(this.state.id);
    this.setState({rawDoc: JSON.stringify(doc, null, 2)});
  }

  async handleSubmit(event) {
    event.preventDefault();

    const rawDoc = this.state.rawDoc.replace(/<uuid>/g, () => uuid());

    await this.context.put(JSON.parse(rawDoc));

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
