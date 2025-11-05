
const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_COUNT = ['src/app', 'src/components', 'src/lib', 'src/ai', 'src/hooks'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

let totalLines = 0;

function countLinesInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Check if this directory is in our list to count
            const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
            if (DIRECTORIES_TO_COUNT.some(d => relativePath.startsWith(d))) {
                traverseDirectory(fullPath);
            }
        } else if (FILE_EXTENSIONS.includes(path.extname(fullPath))) {
            totalLines += countLinesInFile(fullPath);
        }
    }
}

// Start traversal from the project root.
// Since the script is in /scripts, we go one level up to get to the project root.
const projectRoot = path.join(__dirname, '..');

DIRECTORIES_TO_COUNT.forEach(dir => {
    const fullDirPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullDirPath)) {
        traverseDirectory(fullDirPath);
    }
});

console.log(`Total lines of code: ${totalLines}`);
