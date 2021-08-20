import axios from 'axios';

import { Link, TextField } from '@material-ui/core';
import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { set as setContext } from '../state/pageSlice';
import { set as setDebug } from '../state/debugSlice';
import { useSelector } from '../store';

function mapProps(parent, info) {
  return Object.keys(info)
    .sort()
    .map((k) => [`${parent}.${k}`, info[k]]);
}

function About(props) {
  const dispatch = useDispatch();

  const loggedInUser = useSelector((state) => state.user.value);
  const debug = useSelector((state) => state.debug.value);

  const [idbInfo, setIdbInfo] = useState([]);
  const [indexeddbInfo, setIndexeddbInfo] = useState([]);
  const [serverInfo, setServerInfo] = useState([]);

  useEffect(() => window.IDB.info().then((info) => setIdbInfo(mapProps('idb', info))), []);
  useEffect(() => {
    if (loggedInUser.id === 1) {
      window.INDEXEDDB.info().then((info) => setIndexeddbInfo(mapProps('indexeddb', info)));
    }
  }, [loggedInUser.id]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      axios
        .get('./api/deployment')
        .then((response) => {
          const {
            deploy_created_at: created,
            deploy_version: deployVersion,
            release_version: releaseVersion,
            deploy_commit: hash,
          } = response.data;

          const data = [
            ['Deployed At', new Date(created).toLocaleString()],
            ['Deploy Version', deployVersion],
            ['Release', releaseVersion],
            [
              'Build Commit',
              <Link href={`https://github.com/scdf/sanremo/commit/${hash}`}>{hash}</Link>,
            ],
          ];

          response.data.users?.forEach((user) => {
            data.push([`${user.id}.${user.username}`, user.count]);
          });

          setServerInfo(data);
        })
        .catch(console.error);
    }
  }, []);
  useEffect(() => {
    dispatch(
      setContext({
        title: 'About',
        back: true,
        under: 'about',
      })
    );
  }, [dispatch]);

  const handleDebugChange = ({ target }) => {
    dispatch(setDebug(target.value));
  };

  const vars = [
    [<h4>SERVER DETAILS</h4>],
    ['Deployment Type', <b>{process.env.NODE_ENV.toUpperCase()}</b>],
    ...serverInfo,
    [<h4>LOCAL DETAILS</h4>],
    ...idbInfo,
    ...indexeddbInfo,
  ];

  return (
    <Fragment>
      <table>
        <tbody>
          {vars.map(([k, v], idx) => (
            <tr key={idx}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>CONFIGURATION</h4>
      <TextField label="Debug Level" onChange={handleDebugChange} value={debug} />
    </Fragment>
  );
}

export default About;
