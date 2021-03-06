import { Link } from "@material-ui/core";
import { useEffect, useState } from "react";
import Page from "../components/Page";

function About(props) {
  const { db } = props;

  const [ dbInfo, setDbInfo ] = useState([]);

  useEffect(() => db.info().then(info => setDbInfo(Object.keys(info).sort().map((k) => ([`db.${k}`, info[k]])))), [db]);

  const vars = [
    ['Deployment Type', <b>{process.env.NODE_ENV.toUpperCase()}</b>],
    ['Build Date', new Date(process.env.REACT_APP_RELEASE_CREATED_AT).toLocaleString()],
    ['Build Commit', <Link href={`https://github.com/scdf/sanremo/commit/${process.env.REACT_APP_COMMIT}`}>{process.env.REACT_APP_COMMIT}</Link>],
    ...dbInfo
  ];

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
