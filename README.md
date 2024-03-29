# angularpls

In Angular v14 the option was added for standalone components, which would do away with modules in your project. However, Angular language service was not updated with it, and so you have to manually update your component with the import. Gross! This extension fixes that problem by adding Intellisense suggestions for your components and auto importing them.

## Features

!["Example workflow"](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3M2cTFudGw2OWJ4cGljdWQ5amFuaWV5aGRtbWJxbTQxemF5cDF1NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sXnMe8ZYtkbFxhCQQ9/giphy.gif)

- Auto complete your component names in html templates
- Auto import components
- Simplify Angular workflow
- Quick fix to import a missing component (ALS does this sometimes as well, but in my experience it's inconsistent)

## Requirements

- Angular 14+
- ESLint
- NPM

## Installing this extension.

You can either install directly from the extension store, or clone the repository and follow these steps:

1. Run `npm install` to ensure you have all dependencies
2. Run `vsce package` to build the package.
3. Run `code --install-extension angularpls-{version}.vsix` to install the extension.
4. Restart VsCode to ensure it takes effect.

## Extension Settings

- angularpls.index.refreshInterval: angularpls will automatically refresh its index of components, by default every 60 seconds. You can adjust this value to be more or less often here. If you do not want angularpls to automatically refresh, this value should be set to 0, though this is not reccomended.
- angularpls.projectPath: If your project path is something other than the folder in VsCode, this may cause issues in finding your components. If this is the case, you may provide a value here to tell angularpls where to look to find your components. This should only really be necessary if you have something wrapping your angular project, such as an Electron app.

## Commands:

- Reindex Angular components: Manually refreshes the index of Angular components.
- Import by selector: Manually import a component by entering its selector.

## Known Issues

- VsCode (as far as I'm aware) does not provide a way to hook into system generated file creation. As a result, using Angular CLI to generate a component result a short window where angularpls is not aware of your new component. It will update within 60 seconds (or whichever refresh window you have set), or you can update it manually with the reindex command.

If you run into any issues, feel free to create an issue on the project's github page (https://github.com/wasianp0wer/angularpls/issues) and I'll get to it as soon as possible!

## Release Notes

*Any minor releases (x in z.y.x) are fixes to metadata or non-code issues.*

### 1.1.*

Fixed a bug that could occur with an unusual configuration when reindex interval was set to 0. 

### 1.0.\*

The first release version. All features below, plus have been QA. 

### 0.3.0

Added a quickfix to do imports, as well as commands to manually perform actions.

### 0.2.0

Fixed all known bugs and added optimizations.

### 0.1.0

Initial release. Probably full of bugs.
