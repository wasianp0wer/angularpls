// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, InlineCompletionItemProvider, Position, TextDocument } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class ComponentData {
  path: string;
  componentName: string;

  constructor(path: string, componentName: string) {
    this.path = path;
    this.componentName = componentName;
  }
}

// State
let componentSelectorToDataIndex: Map<string, ComponentData>;
let interval: any; // Tracks the setInterval object to prevent memory leaks.

// Config
let reindexInterval: number = 60;
let projectPath: string | undefined;

function getConfiguration() {
  const config = vscode.workspace.getConfiguration('angularpls');
  reindexInterval = config.get('angularpls.index.refreshInterval') ?? 60;
  return config;
}

function getTypescriptFiles(filePath: string): string[] {
  const tsFiles: string[] = [];

  const isGitIgnored = (fileName: string, gitIgnorePath: string): boolean => {
    if (!fs.existsSync(gitIgnorePath)) return false;

    const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf-8');
    const gitIgnorePatterns = gitIgnoreContent.split('\n').filter(Boolean);

    return gitIgnorePatterns.some((pattern) => {
      const regexp = new RegExp(pattern.replace(/\*/g, '.*'));
      return regexp.test(fileName);
    });
  };

  const traverseDirectory = (dirPath: string, gitIgnorePath?: string) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(filePath, fullPath);

      if (!gitIgnorePath || isGitIgnored(relativePath, gitIgnorePath)) {
        return;
      }

      if (fs.statSync(fullPath).isDirectory()) {
        traverseDirectory(fullPath, gitIgnorePath);
      } else if (file.endsWith('component.ts')) {
        tsFiles.push(relativePath);
      }
    });
  };

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const gitIgnorePath = path.join(filePath, '.gitignore');
      traverseDirectory(filePath, gitIgnorePath);
    } else if (filePath.endsWith('component.ts')) {
      tsFiles.push(path.basename(filePath));
    }
  }
  console.log(`Found ${tsFiles.length} component files`);
  return tsFiles;
}

function getRelativeFilePath(file1: string, file2: string): string {
  console.log(path.dirname(file1));
  console.log(file2);
  const relativePath = path.relative(path.dirname(file1), file2);
  return relativePath;
}

function importComponentToFile(component: ComponentData, filePath: string) {
  let importStr: string;
  importStr = `import { ${component.componentName} } from '${getRelativeFilePath(
    filePath,
    `${projectPath}/${switchFileType(component.path, '')}`
  )}'\n`;
  const fileContents = fs.readFileSync(filePath);
  fs.writeFileSync(filePath, importStr + fileContents);
  addImportToAnnotation(component, filePath);

  vscode.commands.executeCommand('editor.action.formatDocument', filePath);
}

function addImportToAnnotation(component: ComponentData, filePath: string) {
  const importRegex = /(@Component\({[\s\S]*imports: \[(\s*))([^}]*}\))/;
  const fileContents = fs.readFileSync(filePath);
  if (importRegex.test(fileContents.toString())) {
    const fileWithImport = fileContents.toString().replace(importRegex, `$1${component.componentName}, $2$3`);
    fs.writeFileSync(filePath, fileWithImport);
  } else {
    const componentRegex = /(@Component\({(\s*))/;
    const fileWithImport = fileContents.toString().replace(componentRegex, `$1imports: [${component.componentName}],$2`);
    fs.writeFileSync(filePath, fileWithImport);
  }
}

function switchFileType(filePath: string, newExtension: string): string {
  // Use the built-in 'path' module to manipulate file paths
  const path = require('path');

  // Get the file's base name and directory
  const fileBaseName = path.basename(filePath, path.extname(filePath));
  const fileDirectory = path.dirname(filePath);

  // Concatenate the new file path with the specified extension
  let newFilePath;
  if (!newExtension) {
    newFilePath = path.join(fileDirectory, `${fileBaseName}`);
  } else {
    newFilePath = path.join(fileDirectory, `${fileBaseName}.${newExtension}`);
  }

  return newFilePath;
}

function importComponent(component: ComponentData) {
  console.log(vscode.window.activeTextEditor?.document.fileName);
  const currentFile = vscode.window.activeTextEditor?.document.fileName;
  if (!currentFile) {
    return;
  }
  const activeComponentFile = switchFileType(currentFile, 'ts');
  importComponentToFile(component, activeComponentFile);
}

function setComponentDataIndex(context: vscode.ExtensionContext) {
  if (!!componentSelectorToDataIndex && componentSelectorToDataIndex.size > 0) {
    return;
  }

  // If we don't have it already, attempt to load the index from state.
  const storedIndex = context.workspaceState.get('componentSelectorToDataIndex') as Map<string, ComponentData>;
  if (storedIndex && storedIndex.size > 0) {
    componentSelectorToDataIndex = storedIndex;
    console.log('etst', componentSelectorToDataIndex);
  } else {
    // If we can't and still don't have the componentSelector data, generate it.
    generateIndex(context);
  }
}

function generateIndex(context: vscode.ExtensionContext) {
  console.log('COMMENCING INDEXING');
  const folderPath = getProjectPath();
  componentSelectorToDataIndex = checkFileContents(getTypescriptFiles(folderPath), folderPath);
  context.workspaceState.update('componentSelectorToDataIndex', componentSelectorToDataIndex);
}

function getProjectPath(): string {
  const config = getConfiguration();
  projectPath = config.get('angularpls.projectPath');
  if (!projectPath) {
    const workspace = vscode.workspace;
    // Check if there is a workspace and it has folders
    if (workspace.workspaceFolders) {
      // Access the first workspace folder
      const firstFolder = workspace.workspaceFolders[0];

      // Get the URI (Uniform Resource Identifier) of the workspace folder
      const folderUri = firstFolder.uri;

      // Get the path of the workspace folder
      const folderPath = folderUri.fsPath;

      projectPath = folderPath;
    } else {
      console.error('No active folder found.');
    }
  }
  return projectPath ?? '';
}

function checkFileContents(filePaths: string[], baseFolderPath: string): Map<string, ComponentData> {
  console.log('Checking files...');
  const componentSelectorToDataIndex: Map<string, ComponentData> = new Map();

  const selectorRegex = /selector: '([^((?<!\\)\')]*)',/;
  // TODO: Instead of including component name in the regex, we should eliminate it based on the file path name (I think???). Wh
  const componentNameRegex = /export class ([\S]*)/; // old regex: /export class (.*Component)/
  let missingSelectorCounter = 0;
  let missingNameCounter = 0;
  let miscSkippedCounter = 0;
  for (const filePath of filePaths) {
    try {
      const fileContents = fs.readFileSync(`${baseFolderPath}/${filePath}`, 'utf-8');
      const selectorMatch = selectorRegex.exec(fileContents);
      if (!selectorMatch || !selectorMatch[1]) {
        console.log(`Skipping ${filePath} due to missing selector`);
        missingSelectorCounter++;
        continue;
      }
      const selector = selectorMatch[1];
      const componentNameMatch = componentNameRegex.exec(fileContents);
      if (!componentNameMatch || !componentNameMatch[1]) {
        console.log(`Skipping ${filePath} due to missing name`);
        missingNameCounter++;
        continue;
      }
      const componentName = componentNameMatch[1];
      componentSelectorToDataIndex.set(selector, new ComponentData(filePath, componentName));
    } catch (error: any) {
      miscSkippedCounter++;
      console.error(`Error reading file ${baseFolderPath}/${filePath}: ${error.message}`);
    }
  }

  console.log(`Files checked: ${filePaths.length}`);
  console.log(`Missing selectors: ${missingSelectorCounter}`);
  console.log(`Missing names: ${missingNameCounter}`);
  console.log(`Files indexed: ${filePaths.length - missingNameCounter - missingSelectorCounter - miscSkippedCounter}`);

  return componentSelectorToDataIndex;
}

export function activate(activationContext: vscode.ExtensionContext) {
  // Get config settings;
  getConfiguration();

  // Set the index;
  setComponentDataIndex(activationContext);

  // Register interval and hooks for reindexing.
  if (!!interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => {
    generateIndex(activationContext);
  }, Math.floor(reindexInterval) * 1000); // Just to be safe, regenerate index every minute. It's not that expensive for some reason.

  const reindexCommand = vscode.commands.registerCommand('angularpls.reindex', () => {
    try {
      generateIndex(activationContext);
      vscode.window.showInformationMessage('angularpls: Reindex successful.');
    } catch {
      vscode.window.showInformationMessage('angularpls: Something went wrong when reindexing. Some components may be missing.');
    }
  });
  activationContext.subscriptions.push(reindexCommand);

  activationContext.subscriptions.push(
    vscode.workspace.onDidCreateFiles((event) => {
      generateIndex(activationContext);
    })
  );

  //

  // Auto import logic starts here

  // Register command to do component importing
  vscode.commands.registerCommand('importComponent', (component: ComponentData) => importComponent(component));

  // Register all the logic for autocomplete and importing based on that autocomplete.
  activationContext.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'html' }, // Specify the language for which the autocompletion is enabled
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          const linePrefix = document.lineAt(position).text.slice(0, position.character);
          const openMarkerRegex = /\<([^\s>]*)$/;
          const suggestions: CompletionItem[] = [];
          const match = openMarkerRegex.exec(linePrefix);
          if (match && match[1]) {
            const selectorInProgress = match[1];
            for (const selector of componentSelectorToDataIndex.keys()) {
              // FIXME: (?) This logic can probably go? Vscode will handle this. However, for some reason it seems slighty more performant
              // so I'm keeping it for now.
              if (selector.includes(selectorInProgress)) {
                const item = new CompletionItem(selector);
                item.commitCharacters = ['>'];
                item.documentation = `angularpls: add and import ${componentSelectorToDataIndex.get(selector)?.componentName} from ${
                  componentSelectorToDataIndex.get(selector)?.path
                }`;
                item.command = { title: 'import component', command: 'importComponent', arguments: [componentSelectorToDataIndex.get(selector)] };
                suggestions.push(item);
              }
            }
          }

          return suggestions;
        }, // Your custom completion item provider
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
