import axios from 'axios';

import { Link } from '@material-ui/core';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { set as setContext } from '../state/pageSlice';

function mapProps(parent, info) {
  return Object.keys(info)
    .sort()
    .map((k) => [`${parent}.${k}`, info[k]]);
}

function About(props) {
  const { db } = props;
  const dispatch = useDispatch();

  const [dbInfo, setDbInfo] = useState([]);
  const [serverInfo, setServerInfo] = useState([]);

  useEffect(() => db.info().then((info) => setDbInfo(mapProps('db', info))), [db]);
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

          setServerInfo([
            ['Deployed At', new Date(created).toLocaleString()],
            ['Deploy Version', deployVersion],
            ['Release', releaseVersion],
            [
              'Build Commit',
              <Link href={`https://github.com/scdf/sanremo/commit/${hash}`}>{hash}</Link>,
            ],
          ]);
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
    ['Deployment Type', <b>{process.env.NODE_ENV.toUpperCase()}</b>],
    ...serverInfo,
    ...dbInfo,
  ];

  return (
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
  );
}

export default About;
