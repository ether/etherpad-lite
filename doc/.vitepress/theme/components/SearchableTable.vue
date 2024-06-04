<template>
  <div>
    <input v-model="search" placeholder="Search..." />
    <table>
      <thead>
      <tr>
        <th v-for="header in headers" :key="header">{{ header }}</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="row in filteredRows" :key="row.id">
        <td v-for="cell in row.cells" :key="cell">{{ cell }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>


const data = [
  { id: 1, cells: ['title', 'The title of your Etherpad instance. This string is displayed in the title bar of every browser.', 'Etherpad'] },
  { id: 2, cells: ['favicon', 'The name of the favicon. This can be a local file that you reference relative to the root folder of your Etherpad instance or an image referenced via an url', './favicon.ico, http://example.com/myImage.ico' ] },
  { id: 3, cells: ['ttl', 'Contains different fields for configuring the OAuth2 access token lifespan', 'You can set it to 3600 to have a token validity of 1 hour.'] },
  { id: 4, cells: ['skinName', 'The name of your Etherpad theme', 'The default theme is Colibri']},
  { id: 5, cells: ['skinVariants', 'The color palette of your pad', 'The default is super-light-toolbar super-light-editor light-background. You can customize that under /p/<your-pad>#skinvariantsbuilder']},
  { id: 6, cells: ['ip', 'The IP address of your Etherpad instance', '0.0.0.0 to listen on all interfaces']},
  {id: 7, cells: ['port', 'The port of your Etherpad instance', '9001']},
  {id: 8, cells: ['suppressErrorsInPadText', 'Whether to show errors in pad', 'false']},
  {id: 9, cells: ['ssl', 'Whether to use SSL', 'false']},
  {id: 10, cells: ['socketTransportProtocols', 'The transport protocol socket io should use for messaging', 'websocket, polling']},
  {id: 11, cells: ['socketIo', 'Allows to increase the maximum size of the message that can be sent to the server', 'maxHttpBufferSize: 50000']},
  {id: 12, cells: ['authenticationMethod', 'The authentication method to use', 'sso, apikey - SSO is the default and uses OAuth2 with above settings for a token. apikey represents the old fashioned way of one API key per instance.']},
  {id: 13, cells: ['dbType', 'Which database to use', 'dirty, postgres, sqlite, mysql, sqlite, cassandra, rethinkdb, surrealdb, mongodb']},
  {id: 14, cells: ['dbSettings', 'The settings for the database', 'See the database documentation for more information https://github.com/ether/ueberDB/blob/main/package.json'] },
  {id: 15, cells: ['defaultPadText', 'The default text of a pad', 'Welcome to Etherpad! This pad text is synchronized as you type, so that everyone viewing this page sees the same text.']},
  {id: 16, cells: ['padOptions', 'The options for a pad', 'See the pad documentation for more information']},
  {id: 17, cells: ['padShortcutEnabled', 'The shortcuts for a pad', 'See the pad documentation for more information']},
  {id: 18, cells: ['toolbar', 'The toolbar of a pad', 'Where the different buttons are placed. See the pad documentation for more information']},
  {id: 19, cells:['requireSession', 'Whether to require a session. If true only a user with a valid session from the API can access a pad', 'false']},
  {id: 20, cells: ['editOnly', 'Whether to only allow editing', 'false']},
  {id: 21, cells: ['maxAge', 'The maximum age of a pad', '60*60*6*1000']},
  {id: 22, cells: ['minify', 'If the CSS and JavaScript files should be minimized. This saves network bandwidth but requires computing resources for minifying the resources', 'true']},
  {id: 23, cells: ['abiword', 'The path to the Abiword binary', '/usr/bin/abiword']},
  {id: 24, cells: ['soffic', 'The path to the soffic binary', '/usr/bin/soffic']},
  {id: 25, cells: ['allowUnknownFileEnds', 'Whether to allow unknown file ends', 'true']},
  {id: 26, cells: ['loglevel', 'The log level of Etherpad', 'INFO']},
  {id: 27, cells: ['disableIPlogging', 'Whether to disable IP logging', 'false']},
  {id: 28, cells: ['automaticReconnectionTimeout', 'The timeout for automatic reconnection', '0 - This means the user is directly reconnected']},
  {id: 29, cells:['loadTest', 'Whether to enable load testing', 'false - Should be set to false in production']},
  {id: 30, cells:['dumpOnUncleanExit', 'Whether to dump on unclean exit', 'false']},
  {id: 31, cells:['indentationOnNewLine', 'Whether to indent on a new line', 'true']},
  {id: 32, cells: ['logconfig', 'Only set if you want to use a custom log4js configuration', '']},
  {id: 33, cells: ['sessionKey', 'The old cookie signing key. This does not have to be set if you are not upgrading from a version before 1.8.0', '']},
  {id: 34, cells: ['trustProxy', 'Whether to trust the proxy via the x-forwarded-for header', 'false']},
]


export default {
  props: {
    headers: Array
  },
  data() {
    return {
      search: ''
    };
  },
  computed: {
    filteredRows() {
      if (!this.search) {
        return data;
      }
      const search = this.search.toLowerCase();
      return data.filter(row => row.cells.some(cell => cell.toLowerCase().includes(search)));
    }
  }
};
</script>
