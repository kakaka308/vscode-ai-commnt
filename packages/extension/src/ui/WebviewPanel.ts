import * as vscode from 'vscode'
import * as path from 'path'
import { getExtensionConfig } from '../config/config'

export class ConfigWebviewPanel {
  public static currentPanel: ConfigWebviewPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private _disposables: vscode.Disposable[] = []

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
    this._panel.webview.html = this._getWebviewContent(panel.webview, extensionUri)
    this._setWebviewMessageListener(panel.webview)
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (ConfigWebviewPanel.currentPanel) {
      ConfigWebviewPanel.currentPanel._panel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'aiCommentConfig',
      'AI Comment Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'node_modules')
        ],
        retainContextWhenHidden: true
      }
    )

    ConfigWebviewPanel.currentPanel = new ConfigWebviewPanel(panel, extensionUri)
  }

  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // Get the local path to main script run in the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'ui', 'assets', 'index.js')
    )

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'ui', 'assets', 'index.css')
    )

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${stylesUri}" rel="stylesheet">
          <title>AI Comment Settings</title>
      </head>
      <body>
          <div id="app"></div>
          <script type="module" src="${scriptUri}"></script>
          <script>
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
          </script>
      </body>
      </html>`
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        const command = message.command
        const config = message.config

        switch (command) {
          case 'loadConfig':
            const loadedConfig = getExtensionConfig()
            webview.postMessage({
              command: 'configLoaded',
              config: loadedConfig
            })
            break

          case 'saveConfig':
            await this._saveConfig(config)
            webview.postMessage({
              command: 'configSaved',
              success: true
            })
            break

          case 'getPreview':
            const preview = this._generatePreview(config)
            webview.postMessage({
              command: 'updatePreview',
              preview
            })
            break
        }
      },
      undefined,
      this._disposables
    )
  }

  private async _saveConfig(config: any) {
    const configuration = vscode.workspace.getConfiguration('aiComment')
    
    // Save each configuration property
    for (const [key, value] of Object.entries(config)) {
      await configuration.update(key, value, vscode.ConfigurationTarget.Global)
    }
    
    vscode.window.showInformationMessage('AI Comment configuration saved successfully!')
  }

  private _generatePreview(config: any): string {
    // Generate preview based on config
    const style = config.commentStyle || 'default'
    const mode = config.commentMode || 'concise'
    
    // Implementation similar to UI store
    return '// Preview comment based on current settings'
  }

  public dispose() {
    ConfigWebviewPanel.currentPanel = undefined
    this._panel.dispose()

    while (this._disposables.length) {
      const disposable = this._disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }
}