// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, InlineCompletionItemProvider, Position, TextDocument } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

class ComponentData {
  path: string;
  componentName: string;

  constructor(path: string, componentName: string) {
    this.path = path;
    this.componentName = componentName;
  }
}

let componentSelectorToDataIndex: Map<string, ComponentData>;

// TODO: Some typescript files are being skipped. Why?
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

    componentSelectorToDataIndex = checkFileContents(getTypescriptFiles(folderPath), folderPath);
  } else {
    console.log('No active folder found.');
  }
}

function checkFileContents(filePaths: string[], baseFolderPath = ''): Map<string, ComponentData> {
  const componentSelectorToDataIndex: Map<string, ComponentData> = new Map();

  const selectorRegex = /selector: '([^((?<!\\)\')]*)',/;
  // TODO: Instead of including component name in the regex, we should eliminate it based on the file path name (I think???).
  const componentNameRegex = /export class (.*Component)/;
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
  // Register the completion item provider
  console.log('activated');
  generateComponentSelectorToDataIndexMap(activationContext);
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
          // console.log(componentSelectorToDataIndex);
          // const simpleCompletion = new vscode.CompletionItem('Hello World!');

          // const snippetCompletion = new vscode.CompletionItem('Good part of the day');
          // snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
          // const docs: any = new vscode.MarkdownString('Inserts a snippet that lets you select [link](x.ts).');
          // snippetCompletion.documentation = docs;
          // docs.baseUri = vscode.Uri.parse('http://example.com/a/b/c/');

          // const commitCharacterCompletion = new vscode.CompletionItem('console');
          // commitCharacterCompletion.commitCharacters = ['.'];
          // commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');

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
              if (selector.includes(selectorInProgress)) {
                suggestions.push(new CompletionItem(selector));
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
