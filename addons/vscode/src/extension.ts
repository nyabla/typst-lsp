import { 
    type ExtensionContext, 
    type TextDocumentChangeEvent,
    type WebviewPanel, 
    ViewColumn,
    Uri,
    commands, 
    extensions,
    workspace, 
    window,
} from "vscode";
import * as path from "path";
import * as fs from "fs";

import {
    LanguageClient,
    DidChangeConfigurationNotification,
    type LanguageClientOptions,
    type ServerOptions,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined = undefined;
let currentPanel: WebviewPanel | undefined = undefined;
let lastPdf: String = '';

export function activate(context: ExtensionContext): Promise<void> {
    const serverCommand = getServer();
    const serverOptions: ServerOptions = {
        run: { command: serverCommand },
        debug: { command: serverCommand },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "typst" }],
    };

    client = new LanguageClient("typst-lsp", "Typst Language Server", serverOptions, clientOptions);

    workspace.onDidChangeConfiguration(async (_) => {
        await client?.sendNotification(DidChangeConfigurationNotification.type, {
            settings: workspace.getConfiguration("typst-lsp"),
        });
    }, null);

    let changeTextDocument = workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
        if (
          e &&
          e.document &&
          window.activeTextEditor != undefined &&
          e.document === window.activeTextEditor.document &&
          e.document.languageId == "typst"
        ) {
          let editor = window.activeTextEditor;
          if (editor) {
            console.log('onDidChangeTextDocument');
          }
        }
    });

    client.onRequest("custom/showPreview", ({pdf}) => {
        updatePreview(pdf);
    });

    context.subscriptions.push(
        commands.registerCommand("typst-lsp.exportCurrentPdf", commandExportCurrentPdf),
        commands.registerCommand("typst-lsp.showPreview", () => commandShowPreview(context)),
        changeTextDocument,
    );

    return client.start();
}

export function deactivate(): Promise<void> | undefined {
    return client?.stop();
}

function getServer(): string {
    const windows = process.platform === "win32";
    const suffix = windows ? ".exe" : "";
    const binaryName = "typst-lsp" + suffix;

    const bundledPath = path.resolve(__dirname, binaryName);

    if (fileExists(bundledPath)) {
        return bundledPath;
    }

    return binaryName;
}

function fileExists(path: string): boolean {
    try {
        fs.accessSync(path);
        return true;
    } catch (error) {
        return false;
    }
}

async function commandExportCurrentPdf(): Promise<void> {
    const activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return;
    }

    const uri = activeEditor.document.uri.toString();

    await client?.sendRequest("workspace/executeCommand", {
        command: "typst-lsp.doPdfExport",
        arguments: [uri],
    });
}

async function commandShowPreview(context: ExtensionContext): Promise<void> {
    if (currentPanel) {
        currentPanel.reveal(ViewColumn.Two);
    } 
    else {
        let editor = window.activeTextEditor;
        currentPanel = window.createWebviewPanel(
            "typst-document", 
            "Typst Document", 
            ViewColumn.Two, 
            {
                localResourceRoots: [Uri.joinPath(context.extensionUri, 'assets')],
                enableScripts: true,
            });

        currentPanel.onDidDispose(
            () => {
                currentPanel = undefined;
            },
            null,
            context.subscriptions
        );

        currentPanel.webview.html = getWebviewContent(context);


        currentPanel.webview.postMessage({ command: 'updatePages', pdf: lastPdf });
    }
}

async function updatePreview(pdf: String): Promise<void> {

    const activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return;
    }
    lastPdf = pdf;
    if(currentPanel)
    {
        currentPanel.webview.postMessage({ command: 'updatePages', pdf:lastPdf });
    }
}


function getWebviewContent(context: ExtensionContext) : string {
    if (!currentPanel || !window.activeTextEditor) {
      return '';
    }  
    const extensionPath = currentPanel.webview.asWebviewUri(context.extensionUri);

    return `
    <!DOCTYPE html>
    <html>
      <head>
      <script>
        window.ExtensionPath = '${extensionPath}';
        window.PdfjsWorkerUrl = '${extensionPath}/assets/pdfjs/pdf.worker.js';
      </script>
      <script src="${extensionPath}/assets/pdfjs/pdf.js"></script>
      <script src="${extensionPath}/assets/viewer.js"></script>
      <style>
        body {
            margin: 0;
            padding: 0;
        }
      </style>
      </head>
      <body>
        <div id="viewerContainer">
        </div>
        <script>

        </script>
      </body>
    </html>
    `;
  }