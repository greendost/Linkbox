const childProcess = require('child_process');
// var ls = childProcess.execSync('ls', { stdio: [0, 1, 2] });
var globalPkgDir = childProcess
  .execSync('npm root -g')
  .toString()
  .trim();

var Mocha = require(globalPkgDir + '/' + 'mocha'),
    fs = require('fs'),
    path = require('path');

var mocha = new Mocha();
mocha.addFile('tests/linkbox_test.js');

mocha.reporter('list').ui('tdd').run();