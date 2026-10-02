import { createApp } from './app.js';
import { openDatabase } from './db/index.js';

const port = Number(process.env.PORT ?? 3001);
const db = openDatabase(process.env.DATABASE_PATH ?? './data/kooka.db');

createApp(db).listen(port, () => {
  console.log(`Kooka API → http://localhost:${port}`);
});
