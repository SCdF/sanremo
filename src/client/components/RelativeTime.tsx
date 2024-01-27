import { formatDistance } from 'date-fns';
import { useState } from 'react';
import { useEffect } from 'react';

function RelativeTime(props: { date: number | Date; interval?: number }) {
  const { date, interval } = props;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), interval || 30 * 1000);

    return () => clearInterval(i);
  }, [interval]);

  return <span>{formatDistance(date, now)} ago</span>;
}

export default RelativeTime;
