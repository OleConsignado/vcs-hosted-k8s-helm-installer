const crypto = require('crypto');
const temp = require('temp');
const fs = require('fs');

temp.track(); // remove all generated temp files on process exit

class Utility {

	static writeToTempFile(obj) {
		const tmpFile = temp.openSync({suffix: ".json"});
		fs.writeSync(tmpFile.fd, JSON.stringify(obj));
		fs.closeSync(tmpFile.fd);

		return tmpFile.path;
	}

	static md5(obj) {

		if(!obj) {
			obj = null;
		}

		return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
	}	
}

module.exports = Utility;