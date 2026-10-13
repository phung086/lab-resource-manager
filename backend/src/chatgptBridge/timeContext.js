// Relative customer dates use the LAB's Vietnam calendar, including after midnight.
export function bridgeTimeContext(now) {
  const offsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs).toISOString();
  return {
    timeZone: 'Asia/Ho_Chi_Minh',
    nowVietnam: local.replace('Z', '+07:00'),
    today: local.slice(0, 10),
    tomorrow: new Date(now.getTime() + offsetMs + 86400000).toISOString().slice(0, 10)
  };
}
