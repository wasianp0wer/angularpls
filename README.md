# angularpls README

In Angular v14 the option was added for standalone components, which would do away with modules in your project. However, Angular language service was not updated with it. Not cool!

![Image: A notification from the Jeremy Renner app, with Jeremy Renner saying "@StefanHeck Nasty!! Not Cool"](https://64.media.tumblr.com/052bda3209119151101d90e323f735f8/b911ea16300852d8-c8/s540x810/b99928d11b07a979d3e6fe0cf6a6c3952635de53.jpg)
*Even Jeremy Renner thinks having to manually import your components is nasty*

Because of that, you would have to manually update your component with the import, which is terrible. This extension fixes that problem by adding Intellisense suggestions for your components.

## Features

- Auto complete your component names
- Auto import components
- Simplifies workflow for Angular

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

- Angular 14+
- ESLint
- NPM

## Running this project

For now, I'm not putting this on the extension store bc right now it is not good enough. To run it for now, open it in VScode, run NPM install, and then press F5 to start a VSCode window with this extension running. Pls let me know if you find any bugs! - Maddie

## Extension Settings

- angularpls.index.refreshInterval: angularpls will automatically refresh its index of components, by default every 60 seconds. You can adjust this value to be more or less often here. If you do not want angularpls to automatically refresh, this value should be set to 0, though this is not reccomended.
- angularpls.projectPath: If your project path is something other than the folder in VsCode, this may cause issues in finding your components. If this is the case, you may provide a value here to tell angularpls where to look to find your components. This should only really be necessary if you have something wrapping your angular project, such as an Electron app.

## Commands:

- Reindex Angular components: Manually refreshes the index of Angular components.

## Known Issues

No known issues at the moment 🏄‍♀️

## Release Notes

### 0.2.0 **Most recent release**

Fixed all known bugs and added optimizations.

### 0.1.0

Initial release. Probably full of bugs.
