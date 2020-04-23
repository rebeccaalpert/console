const fs = require('fs');
const path = require('path');
const common = require('./common.js');

// eslint-disable-next-line no-undef
const packages = path.join(__dirname, '../frontend/packages');

function processFile(fileName, language) {
  // copy data from public.json in package to public
  const file = require(fileName);
  // eslint-disable-next-line no-undef
  const publicFile = path.join(__dirname, `../frontend/public/locales/${language}/public.json`);

  const keys = Object.keys(file);

  fs.readFile(publicFile, function(e, data) {
    if (e) {
      // eslint-disable-next-line no-console
      return console.error(e);
    }

    const json = JSON.parse(data);
    let hasConflict = false;

    for (let i = 0; i < keys.length; i++) {
      if (!json.hasOwnProperty(keys[i])) {
        json[keys[i]] = file[keys[i]];
      } else {
        hasConflict = true;
        // eslint-disable-next-line no-console
        console.log(`Conflict: Key "${keys[i]}" in public.json already exists.`);
      }
    }

    fs.writeFile(publicFile, JSON.stringify(json, null, 2), function(err) {
      if (err) {
        // eslint-disable-next-line no-console
        return console.error(err);
      }
    });

    if (hasConflict) {
      // eslint-disable-next-line no-console
      console.log('Please edit conflicting keys and run yarn i18n again');
    } else {
      common.deleteFile(fileName);
    }
  });
}

function processLocalesFolder(filePath) {
  let language;
  if (path.basename(filePath) === 'en') {
    language = 'en';
  }
  if (path.basename(filePath) === 'zh') {
    language = 'zh';
  }
  if (path.basename(filePath) === 'ja') {
    language = 'ja';
  }
  // eslint-disable-next-line no-undef
  const file = path.join(filePath, '/public.json');
  if (fs.existsSync(file)) {
    processFile(file, language);
  }
}

function iterateThroughLocalesFolder(filePath) {
  common.parseFolder(filePath, processLocalesFolder);
}

function processPackages(filePath) {
  if (common.isDirectory(filePath)) {
    common.findLocalesFolder(filePath, iterateThroughLocalesFolder);
  }
}

common.parseFolder(packages, processPackages);
