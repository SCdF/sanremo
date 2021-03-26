import './App.scss';
import React from 'react';
import { Router } from "@reach/router"

import CssBaseline from '@material-ui/core/CssBaseline';

import db from './db';

import Home from './pages/Home';
import Repeatable from './pages/Repeatable';
import Template from './pages/Template';
import History from './pages/History';
import About from './pages/About';

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Router>
        <Home db={db} path='/' />
        <About db={db} path='/about' />
        <Repeatable db={db} path='repeatable/:repeatableId' />
        <Template db={db} path='template/:templateId' />
        <History db={db} path='history' />
      </Router>
    </React.Fragment>
  );
}

export default App;
