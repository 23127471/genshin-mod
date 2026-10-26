const { getDatabase } = require('../lib/db');

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const db = getDatabase();
  res.status(200).json({
    status: db.status,
    latest_version: db.latest_version,
    maintenance_message: db.maintenance_message,
    changelog: db.changelog,
    updated_at: db.updated_at,
    files: db.files || {}
  });
};
