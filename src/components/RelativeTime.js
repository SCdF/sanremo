import { formatDistance } from "date-fns";
import { useState } from "react";
import { useEffect } from "react";

export function RelativeTime(props) {
  // TODO: is it possible to only have ONE interval that propogates an update to each node
  // that needs it? This seems like something stupid that doesn't scale.
  const [ now, setNow ] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(i);
  });

  return <span>{formatDistance(props.date, now)} ago</span>
}
