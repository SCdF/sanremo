import axios from 'axios';

import { Link } from '@material-ui/core';
import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { set as setContext } from '../features/Page/pageSlice';
import { useSelector } from '../store';
import UpdatePanel from '../features/Update/UpdatePanel';
import DebugPanel from '../features/Debug/DebugPanel';
import SyncPanel from '../features/Sync/SyncPanel';
import db from '../db';

function mapProps(parent, info) {
  return Object.keys(info)
    .sort()
    .map((k) => [`${parent}.${k}`, info[k]]);
}

function About(props) {
  const dispatch = useDispatch();

  const loggedInUser = useSelector((state) => state.user.value);
  // eslint-disable-next-line no-unused-vars
  const _db = db(loggedInUser); // pull it in to force the caching to happen if this is a fresh refresh

  const [idbInfo, setIdbInfo] = useState([]);
  const [serverInfo, setServerInfo] = useState([]);

  // FIXME: get this information correctly
  useEffect(
    () => loggedInUser && window.IDB.info().then((info) => setIdbInfo(mapProps('idb', info))),
    [loggedInUser]
  );

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
              <Link href={`https://github.com/scdf/sanremo/commit/${hash}`}>
                {hash.substr(0, 7)}
              </Link>,
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

  const vars = [
    [<h4>SERVER DETAILS</h4>],
    ['Deployment Type', <b>{process.env.NODE_ENV.toUpperCase()}</b>],
    ...serverInfo,
    [<h4>LOCAL DETAILS</h4>],
    ...idbInfo,
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
      {process.env.NODE_ENV !== 'development' && (
        <Fragment>
          <h4>DATA SYNC</h4>
          <SyncPanel />
          <h4>SOFTWARE VERSION</h4>
          <UpdatePanel />
        </Fragment>
      )}
      <h4>DEBUG</h4>
      <DebugPanel />
    </Fragment>
  );
}

export default About;
