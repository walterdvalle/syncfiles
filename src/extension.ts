import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface SyncPaths {
  source: string;
  target: string;
}

const MAVEN_MARKER_FILE = "maven-build-marker.tmp";
let syncStatusBarItem: vscode.StatusBarItem | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let isSyncing: boolean = false;

function findPomFile(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showInformationMessage(
      "No open projects in the workspace."
    );
    return undefined;
  }

  const pomPath = path.join(workspaceFolders[0].uri.fsPath, "pom.xml");
  return fs.existsSync(pomPath) ? pomPath : undefined;
}

async function askPermissionToModifyPom(): Promise<boolean> {
  const userResponse = await vscode.window.showWarningMessage(
    "Do you want to modify the pom.xml file to monitor Maven?",
    { modal: true },
    "Sim",
    "Não"
  );
  return userResponse === "Sim";
}

function modifyPomFile(pomPath: string): void {
  const pomContent = fs.readFileSync(pomPath, "utf-8");

  const markerPlugin = `
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-antrun-plugin</artifactId>
        <version>3.0.0</version>
        <executions>
          <!-- Execução na fase initialize -->
          <execution>
            <id>create-file</id>
            <phase>initialize</phase>
            <goals>
              <goal>run</goal>
            </goals>
            <configuration>
              <target>
                <echo message="Criando o arquivo no início do processamento"/>
                <touch file="\${project.basedir}/${MAVEN_MARKER_FILE}"/>
              </target>
            </configuration>
          </execution>
          <!-- Execução na fase clean -->
          <execution>
            <id>delete-file</id>
            <phase>package</phase>
            <goals>
              <goal>run</goal>
            </goals>
            <configuration>
              <target>
                <echo message="Apagando o arquivo no final do processamento"/>
                <delete file="\${project.basedir}/${MAVEN_MARKER_FILE}"/>
              </target>
            </configuration>
          </execution>
        </executions>
      </plugin>
  `;

  if (pomContent.includes("<plugins>")) {
    // Insere o plugin dentro da seção existente de <plugins>
    const modifiedPomContent = pomContent.replace(
      /<plugins>([\s\S]*?)<\/plugins>/,
      `<plugins>$1${markerPlugin}</plugins>`
    );
    fs.writeFileSync(pomPath, modifiedPomContent, "utf-8");
  } else if (pomContent.includes("</build>")) {
    // Adiciona a seção <plugins> dentro da seção <build>
    const modifiedPomContent = pomContent.replace(
      /<\/build>/,
      `<plugins>${markerPlugin}</plugins>\n</build>`
    );
    fs.writeFileSync(pomPath, modifiedPomContent, "utf-8");
  } else {
    // Caso o arquivo não tenha seção <build>, exibe um erro
    vscode.window.showErrorMessage(
      "The pom.xml file does not have a <build> section to add plugins."
    );
    return;
  }

  outputChannel?.appendLine("The pom.xml file has been modified successfully.");
}

function loadSyncPaths(): SyncPaths[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No project opened in the workspace.");
    return [];
  }

  const syncFilePath = path.join(
    workspaceFolders[0].uri.fsPath,
    ".sync",
    "syncfiles.json"
  );
  if (!fs.existsSync(syncFilePath)) {
    /*vscode.window.showErrorMessage(
      `Configuration file not found: ${syncFilePath}`
    );*/
    return [];
  }

  try {
    const fileContent = fs.readFileSync(syncFilePath, "utf-8");
    const syncPaths = JSON.parse(fileContent) as SyncPaths[];

    return syncPaths.map((paths) => ({
      source: path.join(workspaceFolders[0].uri.fsPath, paths.source),
      target: path.join(workspaceFolders[0].uri.fsPath, paths.target),
    }));
  } catch (error: unknown) {
    vscode.window.showErrorMessage(
      "Error loading the configuration JSON file."
    );
    outputChannel?.appendLine("Error loading the configuration JSON file.");

    // Verifying if the error is an instance of Error
    if (error instanceof Error) {
      outputChannel?.appendLine(error.message);
    } else {
      outputChannel?.appendLine("Unknown error");
    }
    return [];
  }
}

function syncFile(
  sourcePath: vscode.Uri,
  source: vscode.Uri,
  target: vscode.Uri
) {
  const destFilePath = path.join(
    target.fsPath,
    path.relative(source.fsPath, sourcePath.fsPath)
  );

  if (fs.existsSync(sourcePath.fsPath)) {
    const destDir = path.dirname(destFilePath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
      outputChannel?.appendLine(`NEW ${destDir}`);
    }
    fs.copyFileSync(sourcePath.fsPath, destFilePath);
    outputChannel?.appendLine(`COPY ${sourcePath.fsPath} -> ${destFilePath}`);
  } else if (fs.existsSync(destFilePath)) {
    fs.unlinkSync(destFilePath);
    outputChannel?.appendLine(`DEL ${destFilePath}`);
  }
}

function startWatcher(source: vscode.Uri, target: vscode.Uri) {
  const watcher = fs.watch(
    source.fsPath,
    { recursive: true },
    (eventType, filename) => {
      if (filename) {
        const filePath = path.join(source.fsPath, filename);
        if (!isMavenRunning()) {
          showSyncingStatus();
          if (eventType === "rename" || eventType === "change") {
            syncFile(vscode.Uri.file(filePath), source, target);
          }
          hideSyncingStatus();
        } else {
          outputChannel?.appendLine("Maven is running. Sync paused.");
        }
      }
    }
  );

  outputChannel?.appendLine(
    `Monitoring changes in directory: ${source.fsPath}`
  );
  return watcher;
}

/*function isMavenRunning(): boolean {
  try {
    if (process.platform === "win32") {
      // No Windows, usamos 'wmic' para verificar o processo Maven em execução
      const result = execSync(
        `wmic process where "name='java.exe' and CommandLine like '%maven%'" get CommandLine`
      ).toString();
      return (
        result.toLowerCase().includes("maven") ||
        result.toLowerCase().includes("mvn")
      );
    } else {
      // Em sistemas Unix (Linux/macOS), usamos 'ps aux' com grep para evitar falso positivo
      const result = execSync(
        'ps aux | grep -v grep | grep -i "maven\\|mvn"'
      ).toString();
      return result.length > 0; // Retorna true se houver alguma correspondência
    }
  } catch (error) {
    console.error("Failed to check if Maven is running:", error);
    return false;
  }
 return false;
}*/

function isMavenRunning(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return false;
  }
  const markerFilePath = path.join(
    workspaceFolders[0].uri.fsPath,
    MAVEN_MARKER_FILE
  );
  return fs.existsSync(markerFilePath);
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
      syncStatusBarItem!.text = "$(check) Sync";
      syncStatusBarItem!.show();
      isSyncing = false;
    }, 250);
  }
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Sync Output"); // Create the output channel

  const syncPaths = loadSyncPaths();
  if (syncPaths.length === 0) {
    outputChannel?.appendLine(
      "No synchronization paths configured. Sync disabled."
    );
    return;
  }

  const pomPath = findPomFile();
  if (!pomPath) {
    outputChannel?.appendLine(
      "pom.xml file not found. Maven monitoring disabled."
    );
    // return;
  } else {
    const pomContent = fs.readFileSync(pomPath, "utf-8");
    if (!pomContent!.includes(MAVEN_MARKER_FILE)) {
      askPermissionToModifyPom().then((granted) => {
        if (granted) {
          try {
            modifyPomFile(pomPath);
          } catch (error) {
            vscode.window.showErrorMessage(
              "Error modifying pom.xml file: " + (error as Error).message
            );
          }
        }
      });
    }
  }

  syncStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  syncStatusBarItem.text = "$(check) Sync";
  syncStatusBarItem.tooltip = "File Synchronization";
  syncStatusBarItem.command = "syncExtension.showOutput"; // Define the command to open the output
  syncStatusBarItem.show();
  context.subscriptions.push(syncStatusBarItem, outputChannel);

  // Command to open the output channel when the status item is clicked
  context.subscriptions.push(
    vscode.commands.registerCommand("syncExtension.showOutput", () => {
      outputChannel?.show(); // Show the output channel when clicked
    })
  );

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

export function deactivate() {
  outputChannel?.appendLine("Synchronization plugin deactivated");
}
