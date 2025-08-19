import { formatDistance } from 'date-fns';
import { useState } from 'react';
import { useEffect } from 'react';

function RelativeTime(props: { date: number | Date; interval?: number }) {
  const { date, interval } = props;

  // PERF: is it possible to only have ONE interval that propogates an update to each node
  // that needs it? This seems like something stupid that doesn't scale.
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), interval || 30 * 1000);

    return () => clearInterval(i);
  });

  return <span>{formatDistance(date, now)} ago</span>;
}

export default RelativeTime;
