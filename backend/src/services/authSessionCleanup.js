// One bounded batch per hour. Expiry enforcement remains synchronous in auth middleware.
export function startAuthSessionCleanup(prisma) {
  let work = null;
  const tick = () => {
    if (work) return;
    work = (async () => {
      const now = new Date();
      const expired = await prisma.authSession.findMany({ where: { expiresAt: { lte: now } }, select: { id: true }, orderBy: { expiresAt: 'asc' }, take: 1000 });
      if (expired.length) await prisma.authSession.deleteMany({ where: { id: { in: expired.map(row => row.id) }, expiresAt: { lte: now } } });
    })().catch(() => console.error('Expired session cleanup unavailable')).finally(() => { work = null; });
  };
  const timer = setInterval(tick, 3600000); timer.unref(); tick();
  return () => { clearInterval(timer); return work || Promise.resolve(); };
}
