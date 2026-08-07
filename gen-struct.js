const fs = require('fs');
const path = require('path');

function getStructure(dir, ignore = ['node_modules', '.git', 'dist', '.next', 'build', '.gemini']) {
    const stats = fs.statSync(dir);
    const info = {
        name: path.basename(dir),
        type: stats.isDirectory() ? 'directory' : 'file',
    };

    if (stats.isDirectory()) {
        info.children = fs.readdirSync(dir)
            .filter(child => !ignore.includes(child))
            .map(child => getStructure(path.join(dir, child), ignore));
    }
    return info;
}

const rootPath = 'd:\\work\\HRMS';
const structure = getStructure(rootPath);
fs.writeFileSync(path.join(rootPath, 'project_structure.json'), JSON.stringify(structure, null, 2));
console.log('Project structure saved to project_structure.json');
