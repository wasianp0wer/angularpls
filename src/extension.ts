// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, InlineCompletionItemProvider, Position, TextDocument } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class ComponentData {
  path: string;
  componentName: string;
  importPath?: string; // The path that should be used for the import.

  constructor(path: string, componentName: string, importPath?: string) {
    this.path = path;
    this.componentName = componentName;
    this.importPath = importPath;
  }
}

let componentSelectorToDataIndex: Map<string, ComponentData>;
let projectPath: string;

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
      } else if (file.endsWith('.ts')) {
        tsFiles.push(relativePath);
      }
    });
  };

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      const gitIgnorePath = path.join(filePath, '.gitignore');
      traverseDirectory(filePath, gitIgnorePath);
    } else if (filePath.endsWith('.ts')) {
      tsFiles.push(path.basename(filePath));
    }
  }
  console.log(tsFiles.length);
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
  // if (!component.importPath) {
  importStr = `import { ${component.componentName} } from '${getRelativeFilePath(
    filePath,
    `${projectPath}/${switchFileType(component.path, '')}`
  )}'\n`;
  // } else {
  //   importStr = `import { ${component.componentName} } from '${component.importPath}'\n`;
  // }
  const fileContents = fs.readFileSync(filePath);
  fs.writeFileSync(filePath, importStr + fileContents);
  addImportToAnnotation(component, filePath);
}

function addImportToAnnotation(component: ComponentData, filePath: string) {
  const importRegex = /(@Component\({[\s\S]*imports: \[)([^}]*}\))/;
  const fileContents = fs.readFileSync(filePath);
  const fileWithImport = fileContents.toString().replace(importRegex, `$1${component.componentName}, $2`);
  fs.writeFileSync(filePath, fileWithImport);
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

function getBestPathForImport(filePath: string, pathOptions?: Map<string, RegExp[]>): string | undefined {
  if (!pathOptions) {
    console.error('no path options');
    return undefined;
  }
  for (const pathAlias of pathOptions.keys()) {
    for (let pathRegex of pathOptions.get(pathAlias) ?? []) {
      if (pathRegex.test(filePath)) {
        return pathAlias;
      }
    }
  }
  return undefined;
}

function generateComponentSelectorToDataIndexMap(context: vscode.ExtensionContext) {
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

    componentSelectorToDataIndex = checkFileContents(getTypescriptFiles(folderPath), folderPath);
  } else {
    console.log('No active folder found.');
  }
}

function checkFileContents(filePaths: string[], baseFolderPath: string): Map<string, ComponentData> {
  const componentSelectorToDataIndex: Map<string, ComponentData> = new Map();

  const selectorRegex = /selector: '([^((?<!\\)\')]*)',/;
  // TODO: Instead of including component name in the regex, we should eliminate it based on the file path name (I think???).
  const componentNameRegex = /export class (.*Component)/;
  let missingSelectorCounter = 0;
  let missingNameCounter = 0;
  let miscSkippedCounter = 0;
  let pathMapper: Map<string, RegExp[]> | undefined = new Map();
  try {
    let tempPathMapper = JSON.parse(fs.readFileSync(`${baseFolderPath}/tsconfig.json`).toString()).compilerOptions.paths as {
      [key: string]: string[];
    };
    for (const pathMap of Object.keys(tempPathMapper)) {
      const indexFile = pathMap.replace('*', 'index');
      pathMapper.set(indexFile, []);
      tempPathMapper[pathMap].forEach((p) => {
        pathMapper!.get(indexFile)?.push(new RegExp('^src/' + p.replaceAll('*', '.*').replaceAll('/', '\\/')));
      });
    }
  } catch (e) {
    console.error('Something went wrong while reading tsconfig, skipping this step.', e);
    pathMapper = undefined;
  }
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
      componentSelectorToDataIndex.set(selector, new ComponentData(filePath, componentName, getBestPathForImport(filePath, pathMapper)));
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
  // Register the completion item provider
  console.log('activated');
  generateComponentSelectorToDataIndexMap(activationContext);
  vscode.commands.registerCommand('importComponent', (component: ComponentData) => importComponent(component));

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
          if (linePrefix.trim().length < 3) {
            return [];
          }
          const openMarkerRegex = /\<([^\s>]*)$/;
          const suggestions: CompletionItem[] = [new CompletionItem('Hello world! :3')];
          const match = openMarkerRegex.exec(linePrefix);
          if (match && match[1]) {
            const selectorInProgress = match[1];
            for (const selector of componentSelectorToDataIndex.keys()) {
              // TODO: This logic can probably go? Vscode will handle this.
              // TODO: Don't suggest components that have already been imported
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
