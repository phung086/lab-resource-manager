import { configureQueueTestEnvironment } from "./queuePaginationFixture.js";
configureQueueTestEnvironment();
const [{ createApp }, { prisma }] = await Promise.all([import("../../src/app.js"), import("../../src/db.js")]);
const server = createApp().listen(15015, "127.0.0.1", () => console.log("Isolated pagination test API: http://127.0.0.1:15015"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => { await prisma.$disconnect(); }));
