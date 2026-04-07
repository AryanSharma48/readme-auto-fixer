#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';

import processReadme from '../src/processReadme.js';
import {
    buildLocalFileTree,
    collectNodeDependencies,
    collectPythonDependencies,
    collectScripts,
    getLicenseName
} from '../src/readmeContext.js';

const args = process.argv.slice(2);
const shouldShowHelp = args.includes('--help') || args.includes('-h');
const shouldInit = args.includes('--init');
const shouldForce = args.includes('--force');
const shouldUpdate = args.length === 0 || args.includes('--update');
const hasAction = shouldUpdate || shouldInit || shouldForce;

const supportsColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';
const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m'
};

function colorize(text, ...codes) {
    if (!supportsColor) {
        return text;
    }

    return `${codes.join('')}${text}${ANSI.reset}`;
}

function formatLabel(label, color) {
    return colorize(label, ANSI.bold, color);
}

function printHelp(output = console.log) {
    output([
        formatLabel('Usage', ANSI.blue),
        `  ${colorize('blytz', ANSI.bold, ANSI.green)} ${colorize('[command]', ANSI.dim)}`,
        '',
        formatLabel('Commands', ANSI.blue),
        `  ${colorize('--update', ANSI.yellow)}         ${colorize('Update the existing README.md using project metadata.', ANSI.dim)}`,
        `  ${colorize('--init', ANSI.yellow)}           ${colorize('Create a new README.md and prompt for title and description.', ANSI.dim)}`,
        `  ${colorize('--force', ANSI.yellow)}          ${colorize('Replace the existing README.md with a newly generated one.', ANSI.dim)}`,
        `  ${colorize('--help, -h', ANSI.yellow)}       ${colorize('Show this help message.', ANSI.dim)}`,
        '',
    ].join('\n'));
}

if (shouldShowHelp) {
    printHelp();
    process.exit(0);
}

if (!hasAction) {
    if (args.length > 0) {
        const invalidCommand = args.find(arg => arg.startsWith('-')) || args[0];
        console.error(`${formatLabel('Error', ANSI.red)} Command not available: ${colorize(invalidCommand, ANSI.bold, ANSI.red)}`);
        console.error('');
        printHelp(console.error);
        process.exit(1);
    }
    printHelp();
    process.exit(0);
}

async function promptForTitleAndDescription() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const titleContent = (await rl.question(`${formatLabel('Title', ANSI.yellow)} ${colorize('(leave blank to use project name)', ANSI.dim)}: `)).trim();
        const descriptionContent = (await rl.question(`${formatLabel('Description', ANSI.yellow)} ${colorize('(leave blank to use default intro)', ANSI.dim)}: `)).trim();
        return { titleContent, descriptionContent };
    } finally {
        rl.close();
    }
}

async function main() {
    console.log(`${formatLabel('Info', ANSI.cyan)} Scanning for project files...`);

    const targetDir = process.cwd();
    const readmePath = path.join(targetDir, 'README.md');
    const packageJsonPath = path.join(targetDir, 'package.json');
    const requirementsPath = path.join(targetDir, 'requirements.txt');
    const licensePath = path.join(targetDir, 'LICENSE');
    const readmeExists = fs.existsSync(readmePath);
    const hasPackageJson = fs.existsSync(packageJsonPath);
    const hasRequirements = fs.existsSync(requirementsPath);
    const hasLicense = fs.existsSync(licensePath);

    if (!readmeExists && !shouldInit && !shouldForce) {
        console.error(`${formatLabel('Error', ANSI.red)} No README.md found in this directory. Try ${colorize('--init', ANSI.bold, ANSI.yellow)}.`);
        process.exit(1);
    }

    if (readmeExists && shouldInit && !shouldForce) {
        console.error(`${formatLabel('Error', ANSI.red)} README.md already exists. Try ${colorize('--force', ANSI.bold, ANSI.red)}.`);
        process.exit(1);
    }

    if (!hasPackageJson && !hasRequirements) {
        console.error(`${formatLabel('Error', ANSI.red)} No ${colorize('package.json', ANSI.bold)} or ${colorize('requirements.txt', ANSI.bold)} found in this directory.`);
        process.exit(1);
    }

    console.log(`${formatLabel('Info', ANSI.cyan)} Files found. Processing README...`);

    if (shouldForce && readmeExists) {
        fs.unlinkSync(readmePath);
    }

    const readmeContent = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '';
    const fileTree = buildLocalFileTree(fs, path, targetDir, targetDir);
    const projectName = path.basename(targetDir);
    const licenseName = hasLicense ? getLicenseName(fs.readFileSync(licensePath, 'utf-8')) : '';
    const shouldPromptMetadata = !shouldUpdate;
    const { titleContent, descriptionContent } = shouldPromptMetadata
        ? await promptForTitleAndDescription()
        : { titleContent: '', descriptionContent: '' };
    let context;
    let projectType;

    if (hasPackageJson) {
        const packageJsonData = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonData);

        context = {
            packageJson,
            packages: [{ path: 'package.json', content: packageJson }],
            dependencies: collectNodeDependencies([{ path: 'package.json', content: packageJson }]),
            scripts: collectScripts([{ path: 'package.json', content: packageJson }]),
            fileTree,
            titleContent,
            descriptionContent,
            licenseName,
            username: packageJson.author || process.env.USERNAME || 'Unknown Author',
            projectName: packageJson.name || projectName,
            hasPackageJson: true,
            isMonorepo: false
        };
        projectType = 'node';
    } else {
        const requirementsContent = fs.readFileSync(requirementsPath, 'utf-8');

        context = {
            packages: [{ path: 'requirements.txt', content: requirementsContent }],
            dependencies: collectPythonDependencies([{ path: 'requirements.txt', content: requirementsContent }]),
            scripts: new Map(),
            fileTree,
            titleContent,
            descriptionContent,
            licenseName,
            username: process.env.USERNAME || 'Unknown Author',
            projectName,
            hasPackageJson: false,
            isMonorepo: false
        };
        projectType = 'python';
    }

    const updatedReadme = processReadme(readmeContent, projectType, context);

    fs.writeFileSync(readmePath, updatedReadme, 'utf-8');

    console.log(`${formatLabel('Success', ANSI.green)} README.md has been auto-fixed.`);
}

(main()
    .catch(error => {
        console.error(`${formatLabel('Error', ANSI.red)} An error occurred during processing: ${error.message}`);
        process.exit(1);
    }));
