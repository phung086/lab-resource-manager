export const WORKSPACE_ROUTES = Object.freeze({
  home: 'tong-quan', smart_calendar: 'lich-dat', bookings: 'booking',
  resources: 'tai-nguyen', dashboard: 'van-hanh', monitoring: 'telemetry',
  incidents: 'su-co', escalations: 'thong-bao', maintenance: 'bao-tri',
  admin_management: 'quan-ly-tai-nguyen', users: 'nguoi-dung', payments: 'thanh-toan', profile: 'ho-so',
  ...Object.fromEntries(['ai_analytics', 'ai_advisor', 'conflict_queue', 'quota_fairness',
    'chargeback', 'policy_config', 'allocations', 'pareto', 'timeline', 'digital_twin',
    'what_if', 'concurrency', 'ga_solver', 'ai_rca', 'assistant', 'optimization', 'training', 'logs'].map(id => [id, id]))
});

export function tabFromHash(hash) {
  const path = hash.split('?')[0];
  return Object.keys(WORKSPACE_ROUTES).find(key => `#/workspace/${WORKSPACE_ROUTES[key]}` === path) || 'home';
}

export function hashForTab(tab) {
  return `#/workspace/${WORKSPACE_ROUTES[tab] || tab}`;
}
