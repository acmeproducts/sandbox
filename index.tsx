document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor') as HTMLTextAreaElement;
    const goButton = document.getElementById('go-button') as HTMLButtonElement;
    const sandbox = document.getElementById('sandbox') as HTMLIFrameElement;
    const consoleOutput = document.getElementById('console-output') as HTMLDivElement;
    const clearConsoleButton = document.getElementById('clear-console') as HTMLButtonElement;
    const copyConsoleButton = document.getElementById('copy-console') as HTMLButtonElement;
    const downloadConsoleButton = document.getElementById('download-console') as HTMLButtonElement;
    const pasteRunButton = document.getElementById('paste-run-button') as HTMLButtonElement;
    const uploadRunButton = document.getElementById('upload-run-button') as HTMLButtonElement;
    const fileUploadInput = document.getElementById('file-upload-input') as HTMLInputElement;
    const copyButton = document.getElementById('copy-button') as HTMLButtonElement;
    const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
    const resizer = document.getElementById('resizer') as HTMLDivElement;
    const editorContainer = document.getElementById('editor-container') as HTMLDivElement;
    const consoleContainer = document.getElementById('console-container') as HTMLDivElement;

    const defaultCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Google Drive File Lister</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1a202c; color: #e2e8f0; margin: 0; padding: 1.5rem; }
        .container { max-width: 800px; margin: 0 auto; }
        .hidden { display: none !important; }
        .card { background-color: #2d3748; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
        h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 1rem; color: #fff; }
        p { color: #a0aec0; margin-bottom: 1.5rem; }
        .input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #4a5568; border-radius: 0.375rem; background-color: #1a202c; color: #e2e8f0; font-size: 1rem; margin-bottom: 1rem; }
        .input::placeholder { color: #718096; }
        .btn { display: block; width: 100%; background-color: #dd6b20; color: white; font-weight: bold; padding: 0.75rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.2s; }
        .btn:hover:not(:disabled) { background-color: #c05621; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .status { padding: 1rem; border-radius: 0.375rem; margin-top: 1.5rem; font-weight: 500; }
        .status.info { background-color: rgba(221, 107, 32, 0.2); color: #dd6b20; border: 1px solid rgba(221, 107, 32, 0.3); }
        .status.success { background-color: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
        .status.error { background-color: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
        .item-list { list-style: none; padding: 0; margin: 0; max-height: 40vh; overflow-y: auto; }
        .item { display: flex; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background-color: #4a5568; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.2s; }
        .item:hover { background-color: #718096; }
        .item-icon { width: 1.25rem; height: 1.25rem; margin-right: 0.75rem; color: #f6ad55; }
        .item-name { flex: 1; font-weight: 500; }
        .spinner { margin: 2rem auto; width: 2.5rem; height: 2.5rem; border: 3px solid #4a5568; border-radius: 50%; border-top-color: #dd6b20; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>

<div class="container">
    <!-- Screen 1: Client Secret Input -->
    <div id="secret-screen" class="card">
        <h1>Gooyogle Drive Setup</h1>
        <p>To connect to Google Drive, you need to provide a Client Secret from your Google Cloud project's OAuth 2.0 Client ID.</p>
        <input type="password" id="client-secret" class="input" placeholder="Enter Google Client Secret">
        <button id="save-secret-btn" class="btn">Save & Continue</button>
        <div id="secret-status" class="status info">Your secret is stored securely in your browser's local storage.</div>
    </div>

    <!-- Screen 2: Main Authentication -->
    <div id="auth-screen" class="card hidden">
        <h1>Google Drive File Lister</h1>
        <button id="auth-button" class="btn">Connect to Google Drive</button>
        <button id="logout-button" class="btn hidden" style="background-color: #c53030; margin-top: 1rem;">Disconnect</button>
        <button id="change-secret-btn" class="btn" style="background-color: #718096; margin-top: 1rem;">Change Client Secret</button>
        <div id="auth-status" class="status info">Please connect to your Google Drive account.</div>
    </div>

    <!-- Screen 3: Folder Lister -->
    <div id="folder-screen" class="card hidden">
        <h1>Select a Folder</h1>
        <div id="folder-list-container"></div>
    </div>

    <!-- Screen 4: File Lister -->
    <div id="file-screen" class="card hidden">
        <h1 id="file-list-title">Files in Folder</h1>
        <button id="back-to-folders-btn" class="btn" style="width: auto; padding: 0.5rem 1rem; margin-bottom: 1rem;">← Back to Folders</button>
        <div id="file-list-container"></div>
    </div>
</div>

<script>
// Handle OAuth callback from popup
if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
    const params = new URLSearchParams(window.location.search);
    if (window.opener) {
        if (params.has('error')) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: params.get('error') }, window.location.origin);
        } else if (params.has('code')) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', code: params.get('code') }, window.location.origin);
        }
        window.close();
    }
}

class GoogleDriveProvider {
    constructor() {
        this.clientId = '567988062464-fa6c1ovesqeudqs5398vv4mbo6q068p9.apps.googleusercontent.com'; // Public client ID for this specific flow
        this.redirectUri = window.location.origin + window.location.pathname;
        this.scope = 'https://www.googleapis.com/auth/drive.readonly';
        this.apiBase = 'https://www.googleapis.com/drive/v3';
        this.accessToken = localStorage.getItem('google_access_token');
        this.refreshToken = localStorage.getItem('google_refresh_token');
        this.clientSecret = localStorage.getItem('google_client_secret');
        this.isAuthenticated = !!(this.accessToken && this.refreshToken && this.clientSecret);
    }

    storeCredentials() {
        if (this.accessToken) localStorage.setItem('google_access_token', this.accessToken);
        if (this.refreshToken) localStorage.setItem('google_refresh_token', this.refreshToken);
        if (this.clientSecret) localStorage.setItem('google_client_secret', this.clientSecret);
    }

    clearCredentials() {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_refresh_token');
        this.accessToken = null;
        this.refreshToken = null;
        this.isAuthenticated = false;
    }
    
    setClientSecret(secret) {
        this.clientSecret = secret;
        localStorage.setItem('google_client_secret', secret);
    }

    authenticate() {
        return new Promise((resolve, reject) => {
            if (!this.clientSecret) {
                return reject(new Error('Client Secret is not set.'));
            }

            const authUrl = \`https://accounts.google.com/o/oauth2/v2/auth?\${new URLSearchParams({
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                response_type: 'code',
                scope: this.scope,
                access_type: 'offline',
                prompt: 'consent'
            }).toString()}\`;
            
            const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
            if (!popup) {
                return reject(new Error('Popup blocked. Please allow popups for this site.'));
            }

            const messageHandler = async (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    try {
                        await this.exchangeCodeForTokens(event.data.code);
                        this.isAuthenticated = true;
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    reject(new Error(event.data.error));
                }
            };
            window.addEventListener('message', messageHandler);
        });
    }

    async exchangeCodeForTokens(code) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri
            })
        });
        if (!response.ok) throw new Error('Token exchange failed. Check if your Client Secret is correct.');
        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
             this.refreshToken = tokens.refresh_token;
        }
        this.storeCredentials();
    }
    
    async refreshAccessToken() {
        if (!this.refreshToken) throw new Error('No refresh token available.');
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            })
        });
        if (!response.ok) {
            this.clearCredentials();
            throw new Error('Failed to refresh access token. Please re-authenticate.');
        }
        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        this.storeCredentials();
    }
    
    async makeApiCall(endpoint, options = {}) {
        if (!this.accessToken) throw new Error('Not authenticated.');
        
        const performFetch = async () => {
            const url = \`\${this.apiBase}\${endpoint}\`;
            const headers = { 'Authorization': \`Bearer \${this.accessToken}\`, ...options.headers };
            return await fetch(url, { ...options, headers });
        };
        
        let response = await performFetch();
        if (response.status === 401) {
            try {
                await this.refreshAccessToken();
                response = await performFetch();
            } catch (refreshError) {
                 this.handleLogout(); // Force logout on refresh failure
                 throw refreshError;
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`API call failed: \${response.status} - \${errorText}\`);
        }
        return await response.json();
    }

    async getFolders() {
        const response = await this.makeApiCall('/files?q=mimeType%3D%27application/vnd.google-apps.folder%27&fields=files(id,name)&orderBy=name');
        return response.files;
    }

    async getFiles(folderId) {
        const query = \`'\${folderId}' in parents and trashed=false and (mimeType contains 'image/')\`;
        const response = await this.makeApiCall(\`/files?q=\${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)&orderBy=name\`);
        return response.files;
    }
}

// --- UI Management ---
const ui = {
    screens: {
        secret: document.getElementById('secret-screen'),
        auth: document.getElementById('auth-screen'),
        folder: document.getElementById('folder-screen'),
        file: document.getElementById('file-screen'),
    },
    buttons: {
        saveSecret: document.getElementById('save-secret-btn'),
        auth: document.getElementById('auth-button'),
        logout: document.getElementById('logout-button'),
        backToFolders: document.getElementById('back-to-folders-btn'),
        changeSecret: document.getElementById('change-secret-btn'),
    },
    inputs: {
        clientSecret: document.getElementById('client-secret'),
    },
    status: {
        secret: document.getElementById('secret-status'),
        auth: document.getElementById('auth-status'),
    },
    containers: {
        folderList: document.getElementById('folder-list-container'),
        fileList: document.getElementById('file-list-container'),
    },
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.add('hidden'));
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    },
    
    setStatus(el, message, type = 'info') {
        el.textContent = message;
        el.className = \`status \${type}\`;
    },

    renderList(container, items, itemType) {
        if (items.length === 0) {
            container.innerHTML = \`<p class="status info" style="margin-top: 0;">No \${itemType}s found.</p>\`;
            return;
        }

        const list = document.createElement('ul');
        list.className = 'item-list';
        
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'item';
            li.dataset.id = item.id;
            li.dataset.name = item.name;

            const icon = (itemType === 'folder') 
                ? '<svg class="item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>'
                : '<svg class="item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>';
            
            li.innerHTML = \`\${icon}<span class="item-name">\${item.name}</span>\`;

            if (itemType === 'folder') {
                li.addEventListener('click', () => app.handleFolderClick(item.id, item.name));
            } else if (itemType === 'file') {
                li.addEventListener('click', () => {
                    console.log('Selected file:', item);
                    if (item.webViewLink) {
                        window.open(item.webViewLink, '_blank');
                    }
                });
            }
            
            list.appendChild(li);
        });

        container.innerHTML = ''; // Clear previous content
        container.appendChild(list);
    }
};

// --- App Orchestration ---
const app = {
    provider: new GoogleDriveProvider(),
    
    init() {
        ui.buttons.saveSecret.addEventListener('click', () => this.handleSaveSecret());
        ui.buttons.auth.addEventListener('click', () => this.handleAuth());
        ui.buttons.logout.addEventListener('click', () => this.handleLogout());
        ui.buttons.backToFolders.addEventListener('click', () => this.showFolders());
        ui.buttons.changeSecret.addEventListener('click', () => this.handleChangeSecret());
        
        this.checkInitialState();
    },
    
    checkInitialState() {
        if (!this.provider.clientSecret) {
            ui.showScreen('secret');
        } else if (this.provider.isAuthenticated) {
            this.updateAuthStatus();
            this.showFolders();
        } else {
            ui.showScreen('auth');
            this.updateAuthStatus();
        }
    },
    
    async handleSaveSecret() {
        const secret = ui.inputs.clientSecret.value.trim();
        if (!secret) {
            ui.setStatus(ui.status.secret, 'Please enter a client secret.', 'error');
            return;
        }
        this.provider.setClientSecret(secret);
        ui.setStatus(ui.status.secret, 'Secret saved!', 'success');
        setTimeout(() => this.checkInitialState(), 500);
    },
    
    async handleAuth() {
        ui.buttons.auth.disabled = true;
        ui.setStatus(ui.status.auth, 'Awaiting authentication in popup window...', 'info');
        try {
            await this.provider.authenticate();
            ui.setStatus(ui.status.auth, 'Authentication successful!', 'success');
            this.updateAuthStatus();
            this.showFolders();
        } catch (error) {
            console.error('Authentication error:', error);
            ui.setStatus(ui.status.auth, \`Authentication failed: \${error.message}\`, 'error');
        } finally {
            ui.buttons.auth.disabled = false;
        }
    },
    
    handleLogout() {
        this.provider.clearCredentials();
        this.updateAuthStatus();
        ui.showScreen('auth');
    },

    handleChangeSecret() {
        localStorage.removeItem('google_client_secret');
        this.provider.clientSecret = null;
        this.handleLogout(); // Also clear tokens
        this.checkInitialState(); // Go back to secret screen
    },

    updateAuthStatus() {
        if (this.provider.isAuthenticated) {
            ui.buttons.auth.classList.add('hidden');
            ui.buttons.logout.classList.remove('hidden');
            ui.setStatus(ui.status.auth, 'You are connected to Google Drive.', 'success');
        } else {
            ui.buttons.auth.classList.remove('hidden');
            ui.buttons.logout.classList.add('hidden');
            ui.setStatus(ui.status.auth, 'Please connect to your Google Drive account.', 'info');
        }
    },
    
    async showFolders() {
        ui.showScreen('folder');
        ui.containers.folderList.innerHTML = '<div class="spinner"></div>';
        try {
            const folders = await this.provider.getFolders();
            ui.renderList(ui.containers.folderList, folders, 'folder');
        } catch (error) {
            console.error('Error fetching folders:', error);
            ui.containers.folderList.innerHTML = \`<div class="status error">Error fetching folders: \${error.message}</div>\`;
            if (error.message.includes('re-authenticate')) {
                this.handleLogout();
            }
        }
    },
    
    async handleFolderClick(folderId, folderName) {
        ui.showScreen('file');
        document.getElementById('file-list-title').textContent = \`Files in "\${folderName}"\`;
        ui.containers.fileList.innerHTML = '<div class="spinner"></div>';
        try {
            const files = await this.provider.getFiles(folderId);
            ui.renderList(ui.containers.fileList, files, 'file');
        } catch (error) {
            console.error('Error fetching files:', error);
            ui.containers.fileList.innerHTML = \`<div class="status error">Error fetching files: \${error.message}</div>\`;
            if (error.message.includes('re-authenticate')) {
                this.handleLogout();
            }
        }
    }
};

// Initialize the app
app.init();
</script>
</body>
</html>
`;

    // Initialize editor with the default code
    editor.value = defaultCode;

    // --- Console Logic ---
    function formatLogMessage(args: any[]): string {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Unserializable Object]';
                }
            }
            return String(arg);
        }).join(' ');
    }

    function logToUI(type: 'log' | 'error' | 'warn' | 'info' | 'debug', ...args: any[]) {
        const message = formatLogMessage(args);
        const logEntry = document.createElement('div');
        logEntry.className = `log-${type} py-1 px-2 border-b border-gray-800`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        consoleOutput.appendChild(logEntry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
    };
    
    console.log = (...args) => { logToUI('log', ...args); originalConsole.log.apply(console, args); };
    console.error = (...args) => { logToUI('error', ...args); originalConsole.error.apply(console, args); };
    console.warn = (...args) => { logToUI('warn', ...args); originalConsole.warn.apply(console, args); };
    console.info = (...args) => { logToUI('info', ...args); originalConsole.info.apply(console, args); };
    console.debug = (...args) => { logToUI('debug', ...args); originalConsole.debug.apply(console, args); };
    
    window.addEventListener('error', (event) => {
        console.error(`Uncaught Error: ${event.message}`, `at ${event.filename}:${event.lineno}:${event.colno}`);
    });

    clearConsoleButton.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
    });

    copyConsoleButton.addEventListener('click', () => {
        navigator.clipboard.writeText(consoleOutput.innerText)
            .then(() => alert('Console log copied to clipboard!'))
            .catch(err => console.error('Failed to copy console log:', err));
    });

    downloadConsoleButton.addEventListener('click', () => {
        const blob = new Blob([consoleOutput.innerText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'console-log.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Editor/Sandbox Logic ---
    function runCode() {
        const code = editor.value;
        const instrumentedCode = `
            <script>
                window.onerror = (message, source, lineno, colno, error) => {
                    window.parent.console.error('Uncaught Error: ' + message, 'at ' + source + ':' + lineno + ':' + colno);
                };
                (function() {
                    const originalConsole = window.console;
                    window.console = {
                        ...originalConsole,
                        log: (...args) => { window.parent.console.log(...args); originalConsole.log(...args); },
                        error: (...args) => { window.parent.console.error(...args); originalConsole.error(...args); },
                        warn: (...args) => { window.parent.console.warn(...args); originalConsole.warn(...args); },
                        info: (...args) => { window.parent.console.info(...args); originalConsole.info(...args); },
                        debug: (...args) => { window.parent.console.debug(...args); originalConsole.debug(...args); },
                    };
                })();
            <\/script>
            \${code}
        `;
        sandbox.srcdoc = instrumentedCode;
    }

    goButton.addEventListener('click', runCode);

    pasteRunButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            editor.value = text;
            runCode();
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            alert('Could not paste from clipboard. Your browser might not grant permission automatically.');
        }
    });

    uploadRunButton.addEventListener('click', () => {
        fileUploadInput.click();
    });

    fileUploadInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                editor.value = e.target?.result as string;
                runCode();
            };
            reader.readAsText(file);
        }
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(editor.value)
            .then(() => alert('Code copied to clipboard!'))
            .catch(err => console.error('Failed to copy code:', err));
    });

    downloadButton.addEventListener('click', () => {
        const blob = new Blob([editor.value], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    clearButton.addEventListener('click', () => {
        editor.value = '';
    });

    // --- Resizer Logic ---
    let isResizing = false;
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            window.getSelection()?.removeAllRanges();
        });
    });

    function handleMouseMove(e: MouseEvent) {
        if (!isResizing) return;
        const mainContainer = document.getElementById('main-container') as HTMLElement;
        const totalHeight = mainContainer.offsetHeight;
        const newEditorHeight = e.clientY - editorContainer.offsetTop;
        
        // Constrain resizing
        if (newEditorHeight > 50 && totalHeight - newEditorHeight > 80) { // 80px for console header + some space
            const editorPercentage = (newEditorHeight / totalHeight) * 100;
            editorContainer.style.height = `\${editorPercentage}%`;
            consoleContainer.style.height = `\${100 - editorPercentage}%`;
        }
    }
});