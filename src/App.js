import './App.scss';
import React from 'react';
import { Router, Link } from "@reach/router"

const Home = (props) => {
  const items = props.checklists.map(checklist => 
    <li key={checklist.id}><Link to={`/checklist/${checklist.id}/new`}>{checklist.name}</Link></li>
  );

 return <ul className='App-checklist-list'>{items}</ul>;
};

const Checklist = (props) => {
  const checklist = props.checklists.find(c => c.id === props.checklistId);

  const items = checklist.items.map((item, idx) => 
    <li key={idx}>
      <input type='checkbox' name={item} id={idx+item}></input>
      <label htmlFor={idx+item} className='strikethrough'>{item}</label>
    </li>
  );

  return <div>
    <header>{checklist.name}</header>
    <ol>{items}</ol>
  </div>;
};

class App extends React.Component {
  // eslint-disable-next-line no-useless-constructor
  constructor(props) {
    super(props);

    this.state = {
      checklists: [
        {
          id: 'before-pushing',
          name: 'Before you push to Github',
          items: [
            'Does ESLint pass?',
            'Have you covered your new functionality with unit tests?',
            'How about integration tests?'
          ]
        },
        {
          id: 'wrist-exercises',
          name: 'Wrist exercises',
          items: [
            '20x rotate CW',
            '20x rotate CCW',
            '20x rotate CW',
            '20x rotate CCW',
            '20x rotate CW',
            '20x rotate CCW',
            '10x10s ball squeeze',
            '10x10s ball squeeze',
            '10x10s ball squeeze',
            '10x10s band stretch',
            '10x10s band stretch',
            '10x10s band stretch',
          ]
        }
      ],
    };
  }

  render() {   
    return (
      <div className='App'>
        <header className='App-header'>
          <Link to='/'>Sanremo</Link>
        </header>
        <Router>
          <Home path='/' checklists={this.state.checklists} />
          {/* FIXME: we shouldn't have to pass *all* checklists to each checklist */}
          <Checklist path='checklist/:checklistId/new' checklists={this.state.checklists}/>
        </Router>
      </div>
    );   
  }
}

export default App;
