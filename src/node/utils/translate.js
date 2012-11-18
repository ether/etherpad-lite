var fs = require('fs');
var path = require('path');

Array.prototype.unique=function(a){
  return function(){return this.filter(a)}}(function(a,b,c){return c.indexOf(a,b+1)<0
});

var exploreDir = function (padre, callback) {
	var stat = fs.statSync(padre);
	if (stat.isDirectory()) {
		var 	nombres = fs.readdirSync(padre),
		subdirectorios = [],
		ficheros = [];
		nombres.forEach (function(fich) {
			var ruta_fich = path.join(padre,fich);
			if (fs.statSync(ruta_fich).isDirectory()) {
				subdirectorios.push(ruta_fich);
			} else {
				ficheros.push(ruta_fich);
			}
		});
		callback(padre, subdirectorios, ficheros);
		subdirectorios.forEach(function (d) {
			exploreDir(d, callback);
		});
	} else {
		throw new Error("path: " + padre + " is not a directory");
	}
};

var generateIni = function (ids, ini, section) {
	var result = "["+section+"]\n",
	sufijos = ["", ".title", ".innerHTML", ".alt", ".textContent"];
	ids.forEach (function (id) {
		var partial = "";

		sufijos.forEach (function (sufijo) {
			if (ini.hasOwnProperty(id+sufijo)) partial += id+sufijo+" = "+ini[id+sufijo]+"\n";
		});

		if (partial == "") partial = id+" = "+"\n";
		result += partial;
	});
	return result;
}

var parseIni = function (input) {
	var result = {},
	lineas = input.split('\n');
	lineas.forEach (function(linea) {
		linea = linea.trim();
		if ((linea.length > 0) && (linea[0] != ';') && (linea[0] != '[')) { 
			linea = linea.split('=', 2);
			result[linea[0].trim()]=linea[1].trim();
		}	
	});
	return result;
}

var extractAttr = function (attr, str) {
	var reg_expr = eval("/"+attr+"\s*=\s*['\"]([^'\"]*)['\"]/g"),
	result = [],
	voypor = null;
	while (voypor = reg_expr.exec(str)) {
		result.push(voypor[1]);
	}
	return result;
}

var extractIDs = function (dir) {
	var result = [];
	exploreDir (dir, function (p, s, fichs) {
		fichs.sort().forEach(function(f) {
			var partial = extractAttr ('data-l10n-id', fs.readFileSync(f, 'utf8'));
			if (partial.length > 0) {
				result.push("; "+f);
				result = result.concat(partial);
			} else {
				result.push("; "+f+" data-l10-id NOT FOUND");
			}
		});
	});
	return result.unique();
}

var getTranslationINI = function (locales_dir, lang_code, ids) {
	var ini = locales_dir+'/'+lang_code+'.ini';
	if (!fs.existsSync(ini)) ini = locales_dir+'/en.ini';
	return generateIni (ids, parseIni (fs.readFileSync(ini,'utf8')), lang_code);
}

module.exports.extractIDs = extractIDs;
module.exports.getTranslationINI = getTranslationINI;

