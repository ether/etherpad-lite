import client from 'prom-client'
const db = require('./db/DB').db

const monitor = function () {
  const collectDefaultMetrics = client.collectDefaultMetrics;
  const Registry = client.Registry;
  const register = new Registry();
  collectDefaultMetrics({register});
  const gaugeDB = new client.Gauge({
    name: "ueberdb_stats",
    help: "ueberdb stats",
    labelNames: ['type'],
  })

  for (const [metric, value] of Object.entries(db.metrics)) {
    if (typeof value !== 'number') continue;
    gaugeDB.set({type: metric}, value);
  }


  register.registerMetric(gaugeDB);
  return register
};

export default monitor;
