'use strict';

// Returns a list of stale plugins and their authors email

const superagent = require('superagent');
const currentTime = new Date();

(async () => {
  const res = await superagent.get('https://static.etherpad.org/plugins.full.json');
  const plugins = JSON.parse(res.text);
  for (const plugin of Object.keys(plugins)) {
    const name = plugins[plugin].data.name;
    const date = new Date(plugins[plugin].time);
    const diffTime = Math.abs(currentTime - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > (365 * 2)) {
      console.log(`${name}, ${plugins[plugin].data.maintainers[0].email}`);
    }
  }
})();
