import Page from "../components/Page";

function About() {
  // TODO: either blacklist or whitelist entries for security
  // TODO: sort
  const vars = process.env;

  const varRows = Object.keys(vars).map(k => (
    <tr key={k}><td>{k}</td><td>{vars[k]}</td></tr>
  ));

  return (
    <Page title="About" back under="about">
      <table>
        <thead>
          <tr><th colspn="2">Environment Variables</th></tr>
        </thead>
        <tbody>
          {varRows}
        </tbody>
      </table>
    </Page>
  );
}

export default About;
