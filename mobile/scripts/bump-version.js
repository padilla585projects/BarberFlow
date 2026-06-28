const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch';

const pkgPath = path.join(__dirname, '..', 'package.json');
const appPath = path.join(__dirname, '..', 'app.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
if (type === 'major') newVersion = `${major + 1}.0.0`;
else if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = newVersion;
app.expo.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');

console.log(`Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);
