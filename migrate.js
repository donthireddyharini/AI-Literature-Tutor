const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Check if sessionId column exists
  db.all("PRAGMA table_info(messages)", (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    
    const hasSessionId = rows.some(row => row.name === 'sessionId');
    if (!hasSessionId) {
      console.log('Adding sessionId column to messages table...');
      db.run("ALTER TABLE messages ADD COLUMN sessionId TEXT", (err) => {
        if (err) {
          console.error('Failed to add column:', err);
        } else {
          console.log('Successfully added sessionId column.');
        }
        db.close();
      });
    } else {
      console.log('sessionId column already exists.');
      db.close();
    }
  });
});
