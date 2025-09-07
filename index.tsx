document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT REFERENCES ---
    const pasteButton = document.getElementById('paste-button') as HTMLButtonElement;
    const uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
    const goButton = document.getElementById('go-button') as HTMLButtonElement;
    const copyButton = document.getElementById('copy-button') as HTMLButtonElement;
    const deleteButton = document.getElementById('delete-button') as HTMLButtonElement;
    const closeButton = document.getElementById('close-button') as HTMLButtonElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const runView = document.getElementById('run-view') as HTMLDivElement;
    const codeEditor = document.getElementById('code-editor') as HTMLTextAreaElement;
    const sandboxIframe = document.getElementById('sandbox-iframe') as HTMLIFrameElement;
    const editorButtons = document.getElementById('editor-buttons') as HTMLDivElement;
    const consoleOutput = document.getElementById('console-output') as HTMLDivElement;
    const copyConsoleButton = document.getElementById('copy-console-button') as HTMLButtonElement;
    const downloadConsoleButton = document.getElementById('download-console-button') as HTMLButtonElement;
    const clearConsoleButton = document.getElementById('clear-console-button') as HTMLButtonElement;
    const resizer = document.getElementById('resizer') as HTMLDivElement;
    const editorContainer = document.getElementById('editor-container') as HTMLDivElement;

    // --- DEFAULT CODE ---
    const defaultCode = `<!DOCTYPE html>
<html>
<head>
    <title>Google Drive File Lister</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 text-gray-800 font-sans p-8">
    <div class="max-w-4xl mx-auto">
        <header class="mb-8 text-center">
            <h1 class="text-3xl font-bold text-gray-700">Google Drive File Lister</h1>
            <p class="text-gray-500 mt-2">Sign in to view the first 15 files from your Google Drive root folder.</p>
        </header>

        <div id="auth-container" class="mb-6 flex justify-center space-x-4">
            <button id="authorize_button" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-transform transform hover:scale-105" style="visibility: hidden;">Sign In with Google</button>
            <button id="signout_button" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-transform transform hover:scale-105" style="display: none;">Sign Out</button>
        </div>

        <main id="content" class="bg-white p-6 rounded-lg shadow-md" style="display: none;">
            <h2 class="text-xl font-semibold mb-4 border-b pb-2">Your Files</h2>
            <div id="file-list-container">
                <!-- Files will be listed here -->
            </div>
            <p id="loading-state" class="text-gray-500 text-center py-4">Loading files...</p>
        </main>
    </div>

    <script type="text/javascript">
        // --- CONFIGURATION ---
        // IMPORTANT: Replace with your Google API Client ID from https://console.cloud.google.com/apis/credentials
        const CLIENT_ID = '<YOUR_CLIENT_ID_HERE>';
        
        const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

        let tokenClient;
        let gapiInited = false;
        let gisInited = false;

        const authButton = document.getElementById('authorize_button');
        const signoutButton = document.getElementById('signout_button');
        const contentDiv = document.getElementById('content');
        const fileListContainer = document.getElementById('file-list-container');
        const loadingState = document.getElementById('loading-state');

        // --- GAPI & GIS INITIALIZATION ---
        function gapiLoaded() {
            gapi.load('client', initializeGapiClient);
        }

        async function initializeGapiClient() {
            await gapi.client.init({
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            maybeEnableButtons();
        }

        function gisLoaded() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            gisInited = true;
            maybeEnableButtons();
        }

        function maybeEnableButtons() {
            if (gapiInited && gisInited) {
                authButton.style.visibility = 'visible';
            }
        }
        
        // --- AUTHENTICATION ---
        function handleAuthClick() {
            if (CLIENT_ID === '<YOUR_CLIENT_ID_HERE>') {
                alert('Please replace "<YOUR_CLIENT_ID_HERE>" with your actual Google API Client ID in the code.');
                return;
            }
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                signoutButton.style.display = 'inline-block';
                authButton.textContent = 'Refresh Token';
                await listFiles();
            };

            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                tokenClient.requestAccessToken({prompt: ''});
            }
        }

        function handleSignoutClick() {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token);
                gapi.client.setToken('');
                contentDiv.style.display = 'none';
                authButton.textContent = 'Sign In with Google';
                signoutButton.style.display = 'none';
                fileListContainer.innerHTML = '';
            }
        }

        // --- API CALL ---
        async function listFiles() {
            contentDiv.style.display = 'block';
            fileListContainer.innerHTML = '';
            loadingState.style.display = 'block';
            loadingState.textContent = 'Loading files...';
            
            try {
                const response = await gapi.client.drive.files.list({
                    'pageSize': 15,
                    'fields': 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink)'
                });
                
                loadingState.style.display = 'none';
                const files = response.result.files;
                if (files && files.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'space-y-3';
                    files.forEach((file) => {
                        const li = document.createElement('li');
                        li.className = 'flex items-center p-2 rounded-md hover:bg-gray-50';
                        li.innerHTML = \`
                            <img src="\${file.iconLink}" class="w-6 h-6 mr-3" alt="file icon">
                            <a href="\${file.webViewLink}" target="_blank" class="text-blue-600 hover:underline flex-grow">\${file.name}</a>
                        \`;
                        ul.appendChild(li);
                    });
                    fileListContainer.appendChild(ul);
                } else {
                    fileListContainer.innerHTML = '<p class="text-gray-500">No files found.</p>';
                }
            } catch (err) {
                console.error('API Error:', err);
                loadingState.textContent = \`Error: \${err.result?.error?.message || err.message}. See console for details.\`;
            }
        }

        // --- EVENT LISTENERS ---
        authButton.addEventListener('click', handleAuthClick);
        signoutButton.addEventListener('click', handleSignoutClick);
    </script>
    <script async defer src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
    <script async defer src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
</body>
</html>`;
    
    codeEditor.value = defaultCode;

    // --- CONSOLE LOGIC ---
    const logToConsole = (message: string, level: string = 'log') => {
        const logEntry = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="text-gray-500 mr-2">${timestamp}</span><span class="log-${level}">${message}</span>`;
        logEntry.className = 'py-1 border-b border-gray-700/50';
        consoleOutput.appendChild(logEntry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight; // Auto-scroll
    };

    const clearConsole = () => {
        consoleOutput.innerHTML = '';
        logToConsole('Console cleared.', 'debug');
    };

    const copyConsole = () => {
        navigator.clipboard.writeText(consoleOutput.innerText).then(() => {
             const originalIcon = copyConsoleButton.innerHTML;
             showFeedback(copyConsoleButton, originalIcon, true);
        });
    };

    const downloadConsole = () => {
        const blob = new Blob([consoleOutput.innerText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sandbox-console-log-${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Listen for logs from the iframe
    window.addEventListener('message', (event) => {
        if (event.source !== sandboxIframe.contentWindow) return;
        const { type, level, data } = event.data;
        if (type === 'console') {
            logToConsole(data, level);
        }
    });

    const loggerScript = `
<script>
    const originalConsole = { log: console.log.bind(console), error: console.error.bind(console), warn: console.warn.bind(console), info: console.info.bind(console), debug: console.debug.bind(console) };
    const formatArg = (arg) => {
        if (arg instanceof Error) return \`Error: \${arg.message}\\n\${arg.stack}\`;
        if (typeof arg === 'object' && arg !== null) { try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); } }
        return String(arg);
    };
    const sendLog = (level, args) => {
        try {
            const message = [...args].map(formatArg).join(' ');
            window.parent.postMessage({ type: 'console', level, data: message }, '*');
        } catch (e) { originalConsole.error('Sandbox log failed:', e); }
    };
    console.log = (...args) => { sendLog('log', args); originalConsole.log(...args); };
    console.error = (...args) => { sendLog('error', args); originalConsole.error(...args); };
    console.warn = (...args) => { sendLog('warn', args); originalConsole.warn(...args); };
    console.info = (...args) => { sendLog('info', args); originalConsole.info(...args); };
    console.debug = (...args) => { sendLog('debug', args); originalConsole.debug(...args); };
    window.onerror = (msg, url, line, col, err) => { sendLog('error', [msg, 'at line', line, 'col', col]); originalConsole.error(err); return false; };
    window.addEventListener('unhandledrejection', e => { sendLog('error', ['Unhandled Promise Rejection:', e.reason]); originalConsole.error(e.reason); });
<\/script>`;

    const injectLogger = (html) => {
        return html.replace('</head>', `${loggerScript}</head>`);
    };

    // --- CORE APP LOGIC ---
    const runCode = () => {
        const code = codeEditor.value;
        if (!code.trim()) return;

        clearConsole();
        const codeWithLogger = injectLogger(code);
        const blob = new Blob([codeWithLogger], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        sandboxIframe.src = url;

        runView.style.display = 'block';
        runView.classList.remove('inactive');
        runView.classList.add('active');

        editorButtons.classList.add('hidden');
        closeButton.classList.remove('hidden');
    };

    const closeRunner = () => {
        runView.classList.remove('active');
        runView.classList.add('inactive');
        
        const onAnimationEnd = () => {
            runView.style.display = 'none';
            if (sandboxIframe.src) {
                URL.revokeObjectURL(sandboxIframe.src);
            }
            sandboxIframe.src = 'about:blank';
            runView.removeEventListener('animationend', onAnimationEnd);
        };
        runView.addEventListener('animationend', onAnimationEnd);

        closeButton.classList.add('hidden');
        editorButtons.classList.remove('hidden');
    };

    const showFeedback = (button: HTMLButtonElement, originalIcon: string, isSmall: boolean = false) => {
        const sizeClass = isSmall ? 'w-4 h-4' : 'w-5 h-5';
        const checkIcon = `<svg class="${sizeClass} text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        button.innerHTML = checkIcon;
        setTimeout(() => {
            button.innerHTML = originalIcon;
        }, 1500);
    };

    // --- EVENT LISTENERS ---
    goButton.addEventListener('click', runCode);
    closeButton.addEventListener('click', closeRunner);
    clearConsoleButton.addEventListener('click', clearConsole);
    copyConsoleButton.addEventListener('click', copyConsole);
    downloadConsoleButton.addEventListener('click', downloadConsole);

    pasteButton.addEventListener('click', async () => {
        const originalIcon = pasteButton.innerHTML;
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                codeEditor.value = text;
                goButton.disabled = false;
                showFeedback(pasteButton, originalIcon);
                runCode(); // Auto-run on paste
            }
        } catch (err) {
            logToConsole('Paste failed. Check clipboard permissions.', 'error');
            console.error('Paste failed:', err);
        }
    });

    uploadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                codeEditor.value = e.target?.result as string;
                goButton.disabled = false;
                runCode(); // Auto-run on upload
            };
            reader.readAsText(file);
        }
        fileInput.value = '';
    });

    copyButton.addEventListener('click', () => {
        const originalIcon = copyButton.innerHTML;
        navigator.clipboard.writeText(codeEditor.value).then(() => {
            showFeedback(copyButton, originalIcon);
        }).catch(err => {
            logToConsole('Failed to copy code.', 'error');
            console.error('Copy failed:', err);
        });
    });

    deleteButton.addEventListener('click', () => {
        codeEditor.value = '';
        goButton.disabled = true;
    });

    codeEditor.addEventListener('input', () => {
        goButton.disabled = !codeEditor.value.trim();
    });

    // --- RESIZER LOGIC ---
    const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        document.body.style.userSelect = 'none'; // Prevent text selection during resize
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
        const mainContainerHeight = (editorContainer.parentElement as HTMLDivElement).offsetHeight;
        const newEditorHeight = e.clientY - editorContainer.getBoundingClientRect().top;

        // Constraints
        if (newEditorHeight > 50 && mainContainerHeight - newEditorHeight > 50) {
            editorContainer.style.height = `${newEditorHeight}px`;
        }
    };

    const onMouseUp = () => {
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);

    // --- INITIAL STATE ---
    goButton.disabled = !codeEditor.value.trim();
    logToConsole('Sandbox initialized. Ready to run code.', 'info');
});
