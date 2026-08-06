const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://laundrymatic-51608-default-rtdb.asia-southeast1.firebasedatabase.app/',
});

const db = admin.database();
const ref = db.ref('weightHistory');

async function deleteInBatches() {
  console.log('Starting batch deletion...');
  let totalDeleted = 0;

  while (true) {
    // Fetch only 500 items at a time
    const snapshot = await ref.limitToFirst(500).once('value');
    const data = snapshot.val();

    if (!data) {
      console.log(`\n✅ Finished! Deleted a total of ${totalDeleted} records. weightHistory is now empty.`);
      process.exit(0);
    }

    // Prepare an object of updates setting each key to null (which deletes it)
    const updates = {};
    Object.keys(data).forEach(key => {
      updates[key] = null;
    });

    // Apply the batch delete
    await ref.update(updates);
    
    totalDeleted += Object.keys(data).length;
    process.stdout.write(`Deleted ${totalDeleted} records so far...\r`);
  }
}

deleteInBatches().catch(err => {
  console.error('\nError during cleanup:', err);
  process.exit(1);
});