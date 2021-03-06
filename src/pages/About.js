import { Link } from "@reach/router";
import { useEffect, useState } from "react";
import Page from "../components/Page";

function About(props) {
  const { db } = props;

  const [ dbInfo, setDbInfo ] = useState({});

  useEffect(() => db.info().then(info => setDbInfo(info)), [db]);

  const vars = [
    ['Deployment Type', <b>{process.env.NODE_ENV.toUpperCase()}</b>],
  ];

  if (process.env.NODE_ENV === 'production') {
    vars.push([
      ['Release Version', process.env.REACT_APP_RELEASE_VERSION],
      ['Release Created At', Date.parse(process.env.REACT_APP_RELEASE_CREATED_AT)],
      ['Release Description', process.env.REACT_APP_RELEASE_DESCRIPTION],
      ['Commit', <Link href={`https://github.com/scdf/sanremo/commit/${process.env.REACT_APP_COMMIT}`}>{process.env.REACT_APP_COMMIT}</Link>]
    ]);
  }

  vars.push(['Local Database', JSON.stringify(dbInfo)]);

  return (
    <Page title="About" back under="about">
      <table>
        <tbody>
          {vars.map(([k,v], idx) => <tr key={idx}><td>{k}</td><td>{v}</td></tr>)}
        </tbody>
      </table>
    </Page>
  );
}

export default About;
