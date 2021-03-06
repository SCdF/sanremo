import Page from "../components/Page";

function About() {
  return (
    <Page title="About" back under="about">
      <blockquote>
        {JSON.stringify(process.env, null, 2)}
      </blockquote>
    </Page>
  );
}

export default About;
