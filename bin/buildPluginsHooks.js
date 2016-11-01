var fs = require('fs');
var path = require('path');
var _ = require('ep_etherpad-lite/node_modules/underscore');
var npm = require('ep_etherpad-lite/node_modules/npm/lib/npm.js');
var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');
var settings = require("../settings.json");
var UglifyJS = require('ep_etherpad-lite/node_modules/uglify-js');

if (!settings.minify) {
    return;
}

npm.load(function() {
    plugins.getPackages(function(error, packages) {
        const files = [];
        let content = '';

        Object.keys(packages).forEach(name => {
            const definitionPath = path.resolve(packages[name].path, 'ep.json');
            const definition = fs.readFileSync(definitionPath, 'utf-8', error => console.error("Unable to load plugin definition file " + plugin_path));
            let definitionData;

            try {
                definitionData = JSON.parse(definition);
            } catch(e) {}

            definitionData && definitionData.parts.forEach(part => {
                if (part.client_hooks) {
                    files.push.apply(files, _.values(part.client_hooks).map(path => path.split(':')[0] + '.js'));
                }
            });
        });

        _.uniq(files).forEach(file => {
            const fileContent = fs.readFileSync(path.resolve(__dirname, `../node_modules/${file}`), 'utf-8');

            console.info(file);

            content += `require.define({ '${file}': function(require, exports, module) { ${fileContent} } });\n`
        });

        fs.writeFile(
            path.resolve(__dirname, '../src/static/js/plugins.min.js'),
            UglifyJS.minify(content, { fromString: true }).code,
            'utf8'
        );
    });
});