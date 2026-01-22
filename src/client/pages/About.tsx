import { Link } from '@mui/material';
import { Fragment, type ReactNode, useEffect, useState } from 'react';

import db from '../db';
import DebugPanel from '../features/Debug/DebugPanel';
import { usePageContext } from '../features/Page/pageSlice';
import SyncPanel from '../features/Sync/SyncPanel';
import UpdatePanel from '../features/Update/UpdatePanel';
import { useSelector } from '../store';

type InfoRow = [string | ReactNode, (string | ReactNode)?];

function mapProps(parent: string, info: Record<string, unknown>): InfoRow[] {
  return Object.keys(info)
    .sort()
    .map((k) => [`${parent}.${k}`, String(info[k])]);
}

function About() {
  usePageContext({ title: 'About', back: true, under: 'about' });

  const loggedInUser = useSelector((state) => state.user.value);
  // eslint-disable-next-line no-unused-vars
  const handle = db(loggedInUser); // pull it in to force the caching to happen if this is a fresh refresh

  const [idbInfo, setIdbInfo] = useState<InfoRow[]>([]);
  const [serverInfo, setServerInfo] = useState<InfoRow[]>([]);

  useEffect(() => {
    handle
      .info()
      .then((info) => setIdbInfo(mapProps('db', info as unknown as Record<string, unknown>)));
  }, [handle]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      fetch('./api/deployment')
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((responseData) => {
          const {
            deploy_version: deployVersion,
            release_version: releaseVersion,
            deploy_commit: hash,
          } = responseData;

          const data: InfoRow[] = [
            ['Deploy Version', deployVersion],
            ['Release', releaseVersion],
            [
              'Build Commit',
              <Link key="commit-link" href={`https://github.com/scdf/sanremo/commit/${hash}`}>
                {hash.substr(0, 7)}
              </Link>,
            ],
          ];

          for (const user of responseData.users) {
            data.push([`${user.id}.${user.username}`, user.count]);
          }

          setServerInfo(data);
        })
        .catch(console.error);
    }
  }, []);

  const vars: InfoRow[] = [
    [<h4 key="server-header">SERVER DETAILS</h4>],
    ['Deployment Type', <b key="deploy-type">{process.env.NODE_ENV?.toUpperCase()}</b>],
    ...serverInfo,
    [<h4 key="local-header">LOCAL DETAILS</h4>],
    ...idbInfo,
  ];

  return (
    <Fragment>
      <table>
        <tbody>
          {vars.map(([k, v], idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: it's fine in this case
            <tr key={idx}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>DATA SYNC</h4>
      <SyncPanel />
      {/* 'development' === `npm run dev`, so auto-reloading */}
      {process.env.NODE_ENV !== 'development' && (
        <Fragment>
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
