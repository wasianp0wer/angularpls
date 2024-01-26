// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, InlineCompletionItemProvider, Position, TextDocument } from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

const componentSelectorToDataIndex: { [key: string]: ComponentData } = {};

class ComponentData {
  path: string;
  componentName: string;

  constructor(path: string, componentName: string) {
    this.path = path;
    this.componentName = componentName;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

function getTypescriptFiles(folderPath: string): string[] {
  const result: string[] = [];

  function scanDirectory(currentPath: string): void {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(filePath);
      } else if (stats.isFile() && path.extname(filePath) === '.ts') {
        // Check if the file has a .ts extension
        result.push(filePath);
      }
    }
  }

  scanDirectory(folderPath);
  return result;
}

function generateComponentSelectorToDataIndexMap(context: vscode.ExtensionContext) {
  console.log(context.)
  // const tsFiles = getTypescriptFiles(context.)
}

export function activate(context: vscode.ExtensionContext) {
  // Register the completion item provider
  console.log('activated');
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file' }, // Specify the language for which the autocompletion is enabled
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          // const simpleCompletion = new vscode.CompletionItem('Hello World!');

          // const snippetCompletion = new vscode.CompletionItem('Good part of the day');
          // snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
          // const docs: any = new vscode.MarkdownString('Inserts a snippet that lets you select [link](x.ts).');
          // snippetCompletion.documentation = docs;
          // docs.baseUri = vscode.Uri.parse('http://example.com/a/b/c/');

          // const commitCharacterCompletion = new vscode.CompletionItem('console');
          // commitCharacterCompletion.commitCharacters = ['.'];
          // commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');

          // const linePrefix = document.lineAt(position).text.slice(0, position.character);
          // console.log(linePrefix);

          return [];
        }, // Your custom completion item provider
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
