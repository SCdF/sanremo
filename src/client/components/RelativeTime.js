import { formatDistance } from "date-fns";
import { useState } from "react";
import { useEffect } from "react";

function RelativeTime(props) {
  const { date } = props;

  // TODO: is it possible to only have ONE interval that propogates an update to each node
  // that needs it? This seems like something stupid that doesn't scale.
  const [ now, setNow ] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(i);
  });

  return <span>{formatDistance(date, now)} ago</span>
}

export default RelativeTime;