"use strict";

var fs = require('fs');
var path = require('path');

function readJson(file) {
	return (fs.readFileSync(file, 'utf8')).replace(/[\r\n\t]/g, '');
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, "\t"), 'utf8');
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);

	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomIntEx(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function copyFile(file, newFile) {
	fs.copyFileSync(file, newFile, function(err) {});
}

function addDir(dir) {
	fs.mkdirSync(dir);
}

function removeDir(dir) {
	fs.readdirSync(dir).forEach(function(file, index) {
		var curPath = path.join(dir, file);
		
		if (fs.lstatSync(curPath).isDirectory()) {
			removeDir(curPath);
		} else {
			fs.unlinkSync(curPath);
		}
    });
    
	fs.rmdirSync(dir);
}

module.exports.readJson = readJson;
module.exports.writeJson = writeJson;
module.exports.getRandomInt = getRandomInt;
module.exports.getRandomIntEx = getRandomIntEx;
module.exports.copyFile = copyFile;
module.exports.addDir = addDir;
module.exports.removeDir = removeDir;