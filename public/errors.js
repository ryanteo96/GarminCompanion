// Plain-language copy for load failures. status 0 means the request never reached the server.
export function friendly({ status, message }) {
  const m = String(message ?? '');
  if (status === 'empty') return ['Garmin returned no data for this range', 'Try a longer range, or check that your watch has synced.'];
  if (status === 'timeout') return ['This is taking too long', 'The server did not answer in time. Try again in a moment.'];
  if (status === 0) return ["Can't reach the dashboard", 'Check your connection, then try again.'];
  if (/\b429\b/.test(m)) return ['Garmin is limiting requests right now', 'Wait a minute, then try again.'];
  if (/token exchange|\b40[13]\b/.test(m)) return ['Garmin rejected your API key', 'It may have expired. Create a new key in Garmin Connect and update GARMIN_API_KEY in your Vercel settings.'];
  if (status === 502) return ["Couldn't get your data from Garmin", 'This is usually temporary. Try again in a moment.'];
  return ['Something went wrong', 'Try again. If it keeps happening, check the server logs.'];
}
