import client from 'prom-client';
const db = require('./db/DB').db;

const register = new client.Registry();
const gaugeDB = new client.Gauge({
  name: 'ueberdb_stats',
  help: 'ueberdb stats',
  labelNames: ['type'],
});
register.registerMetric(gaugeDB);
client.collectDefaultMetrics({register});

const monitor = function () {
  for (const [metric, value] of Object.entries(db.metrics)) {
    if (typeof value !== 'number') continue;
    gaugeDB.set({type: metric}, value);
  }
  return register;
};

export default monitor;
