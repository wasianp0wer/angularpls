import * as vscode from 'vscode';
import { ComponentData } from './extension';

export class ComponentQuickPick implements vscode.QuickPickItem {
  label: string;
  data: ComponentData;

  constructor(data: ComponentData) {
    this.label = data.componentName + ' from ' + data.path;
    this.data = data;
  }
}
