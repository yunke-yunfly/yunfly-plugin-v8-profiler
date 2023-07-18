const fs = require('fs-extra');
const path = require('path');

fs.copySync(path.join(__dirname,'/src/view'), path.join(__dirname,'/dist/view'));
fs.copySync(path.join(__dirname,'/src/static'), path.join(__dirname,'/dist/static'));
