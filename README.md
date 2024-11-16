# Sync Extension

The **Sync Extension** is a Visual Studio Code extension designed to monitor and synchronize files between specified source and target directories automatically. This extension is useful for scenarios where multiple directories need to stay in sync while coding, building, or deploying.

Repo: https://github.com/walterdvalle/syncfiles

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-F7CA88?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://ko-fi.com/waltervalle)

## Features

- **Automatic File Synchronization**: Monitors specified source directories for changes and synchronizes updates with target directories.
- **Event-Based Triggers**: Detects file changes, creations, deletions, and renaming events to ensure the target directory always mirrors the source.
- **Maven Detection**: Pauses synchronization if a Maven build is detected to avoid conflicts and resumes once the build completes.
- **Status Bar Integration**: Shows the synchronization status in the VS Code status bar, making it easy to see when the extension is active.
- **Output Logging**: Logs synchronization events (such as file creations, deletions, and updates) to the Output panel in VS Code.

## Installation

1. Install the extension from the VS Code Marketplace.
2. Configure the `syncfiles.json` file in the `.sync` folder of your project.

## Usage

The extension automatically activates on project load and monitors directories based on your configuration.

### Configuration

Create a configuration file called `syncfiles.json` in a `.sync` directory at the root of your project. This file specifies the source and target directories for synchronization.

### Example Configuration File

```json
{
  "syncPairs": [
    {
      "source": "./src/main/webapp",
      "target": "./target/diarias"
    },
    {
      "source": "./target/classes",
      "target": "./target/diarias/WEB-INF/classes"
    }
  ]
}
```

  - **`syncPairs`**: An array of objects, each defining a source-target pair.
  - **`source`**: The directory to monitor for changes.
  - **`target`**: The directory where synchronized files will be copied.

### Running the Extension

1. Open the project in Visual Studio Code.
2. Ensure `syncfiles.json` is properly configured.
3. The extension will automatically start monitoring based on the configuration and log activities in the Output panel.

## Commands

- **Start Sync**: Manually start the synchronization if it is paused.

## Notes

- The extension automatically pauses if it detects an ongoing Maven build to prevent any file conflicts.
- All synchronization activities are logged in the Output panel under "Sync Extension."

### License

This project is licensed under the MIT License. 
