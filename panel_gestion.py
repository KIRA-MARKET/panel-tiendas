#!/usr/bin/env python3
"""Panel de Gestión — App de escritorio con PyWebView."""

import os
import sys
import subprocess
import threading
import queue
import json

# Set the Dock icon and app name on macOS
try:
    from AppKit import NSApplication, NSImage
    from Foundation import NSBundle

    bundle = NSBundle.mainBundle()
    info = bundle.localizedInfoDictionary() or bundle.infoDictionary()
    if info:
        info["CFBundleName"] = "Panel de Gestión"

    app = NSApplication.sharedApplication()
    icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ICONO APP.png")
    if os.path.exists(icon_path):
        icon = NSImage.alloc().initWithContentsOfFile_(icon_path)
        app.setApplicationIconImage_(icon)
except Exception:
    pass

import webview

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_PYTHON = os.path.expanduser("~/nominas_env/bin/python3")

SCRIPTS = {
    "facturas_kira":   "gestionar_facturas_kira.py",
    "facturas_reypik": "gestionar_facturas_reypik.py",
    "nominas_kira":    "enviar_nominas_kira.py",
    "nominas_reypik":  "enviar_nominas_reypik.py",
}


class Api:
    def __init__(self):
        self._output_queue = queue.Queue()
        self._running = False
        self._exit_code = None
        self._proc = None

    def open_horarios(self):
        path = os.path.join(BASE_DIR, "app_horarios_v8.html")
        subprocess.Popen(["open", path])

    def run_script(self, key, stdin_text):
        script = SCRIPTS.get(key)
        if not script:
            return
        self._output_queue = queue.Queue()
        self._running = True
        self._exit_code = None
        thread = threading.Thread(
            target=self._execute, args=(script, stdin_text), daemon=True
        )
        thread.start()

    def send_input(self, text):
        """Send a line of input to the running process."""
        if self._proc and self._proc.stdin:
            try:
                self._proc.stdin.write(text + "\n")
                self._proc.stdin.flush()
            except Exception:
                pass

    def poll_output(self):
        lines = []
        while not self._output_queue.empty():
            try:
                lines.append(self._output_queue.get_nowait())
            except queue.Empty:
                break
        return json.dumps({
            "lines": lines,
            "running": self._running,
            "exit_code": self._exit_code,
        })

    def _execute(self, script, stdin_text):
        path = os.path.join(BASE_DIR, script)
        try:
            self._proc = subprocess.Popen(
                [VENV_PYTHON, "-u", path],
                cwd=BASE_DIR,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            # Send pre-filled stdin in a separate thread so we can read stdout
            if stdin_text:
                def write_stdin():
                    try:
                        self._proc.stdin.write(stdin_text)
                        self._proc.stdin.flush()
                    except Exception:
                        pass
                threading.Thread(target=write_stdin, daemon=True).start()

            for line in self._proc.stdout:
                self._output_queue.put(line.rstrip("\n"))
            self._proc.wait()
            self._exit_code = self._proc.returncode
        except Exception as e:
            self._output_queue.put(f"Error: {e}")
            self._exit_code = 1
        self._running = False
        self._proc = None

    def pick_file(self):
        """Open native file picker and return selected path."""
        try:
            result = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=("PDF Files (*.pdf)",),
            )
            if result and len(result) > 0:
                return str(result[0])
        except Exception:
            pass
        return ""


HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
        height: 100vh;
        background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #fff;
        overflow-y: auto;
    }

    .view { display: none; width: 100%; flex: 1; flex-direction: column; align-items: center; justify-content: center; }
    .view.active { display: flex; }

    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.3rem; letter-spacing: -0.5px; }
    .subtitle { font-size: 0.95rem; color: rgba(255,255,255,0.45); margin-bottom: 2.5rem; }

    .grid { display: flex; gap: 1.8rem; flex-wrap: wrap; justify-content: center; }

    .card {
        width: 180px; height: 200px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.9rem;
        cursor: pointer; transition: all 0.3s ease;
        -webkit-backdrop-filter: blur(10px);
    }
    .card:hover { transform: translateY(-6px); background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.25); box-shadow: 0 16px 32px rgba(0,0,0,0.3); }
    .card:active { transform: translateY(-2px); }

    .icon {
        width: 66px; height: 66px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center; font-size: 1.8rem;
    }
    .icon-horarios { background: linear-gradient(135deg, #667eea, #764ba2); }
    .icon-facturas { background: linear-gradient(135deg, #f093fb, #f5576c); }
    .icon-nominas  { background: linear-gradient(135deg, #4facfe, #00f2fe); }

    .card-label { font-size: 0.95rem; font-weight: 600; }

    .back {
        position: absolute; top: 1.2rem; left: 1.2rem;
        display: flex; align-items: center; gap: 0.3rem;
        color: rgba(255,255,255,0.4); font-size: 0.85rem;
        cursor: pointer; transition: color 0.2s; border: none; background: none;
    }
    .back:hover { color: #fff; }
    .back svg { width: 16px; height: 16px; fill: currentColor; }

    .header-icon {
        width: 72px; height: 72px; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        font-size: 2rem; margin-bottom: 1rem;
    }

    .selector-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem; }
    .selector-sub { color: rgba(255,255,255,0.4); font-size: 0.85rem; margin-bottom: 2rem; }

    .options { display: flex; gap: 1.3rem; flex-wrap: wrap; justify-content: center; }

    .option {
        width: 220px; padding: 1.6rem 1.2rem;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 18px;
        display: flex; flex-direction: column; align-items: center; gap: 0.8rem;
        cursor: pointer; transition: all 0.3s ease;
    }
    .option:hover { transform: translateY(-6px); background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.25); box-shadow: 0 16px 32px rgba(0,0,0,0.3); }

    .logo {
        width: 56px; height: 56px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; font-weight: 800;
    }
    .logo-kira   { background: linear-gradient(135deg, #f7971e, #ffd200); }
    .logo-reypik { background: linear-gradient(135deg, #11998e, #38ef7d); }

    .option-name { font-size: 1rem; font-weight: 600; }

    /* ── Forms ── */
    .form-section {
        width: 90%; max-width: 420px;
        margin-top: 1.5rem;
    }

    .form-title {
        font-size: 1.3rem; font-weight: 700; margin-bottom: 0.3rem; text-align: center;
    }

    .form-sub {
        font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-bottom: 1.5rem; text-align: center;
    }

    .field { margin-bottom: 1.2rem; }
    .field label {
        display: block; font-size: 0.8rem; font-weight: 600;
        color: rgba(255,255,255,0.6); margin-bottom: 0.4rem;
    }
    .field input[type="date"], .field input[type="text"] {
        width: 100%; padding: 0.7rem 1rem;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; color: #fff; font-size: 0.9rem;
        outline: none; transition: border-color 0.2s;
    }
    .field input:focus { border-color: rgba(255,255,255,0.4); }
    .field input::placeholder { color: rgba(255,255,255,0.25); }
    ::-webkit-calendar-picker-indicator { filter: invert(1); }

    .file-picker-row {
        display: flex; gap: 0.6rem; align-items: center;
    }
    .file-picker-row input { flex: 1; }
    .btn-pick {
        padding: 0.7rem 1rem; border-radius: 10px; border: none;
        background: rgba(255,255,255,0.12); color: #fff;
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
        white-space: nowrap; transition: background 0.2s;
    }
    .btn-pick:hover { background: rgba(255,255,255,0.22); }

    .drop-zone {
        border: 2px dashed rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 1.2rem;
        text-align: center;
        color: rgba(255,255,255,0.35);
        font-size: 0.8rem;
        margin-top: 0.5rem;
        transition: all 0.2s;
        cursor: pointer;
    }
    .drop-zone.dragover {
        border-color: #4facfe;
        background: rgba(79,172,254,0.08);
        color: #4facfe;
    }
    .drop-zone.has-file {
        border-color: rgba(78,205,196,0.4);
        color: rgba(78,205,196,0.8);
    }

    .btn-launch {
        width: 100%; padding: 0.8rem; border-radius: 12px; border: none;
        font-size: 0.95rem; font-weight: 700; cursor: pointer;
        transition: all 0.2s; margin-top: 0.5rem;
    }
    .btn-launch-facturas { background: linear-gradient(135deg, #f093fb, #f5576c); color: #fff; }
    .btn-launch-facturas:hover { opacity: 0.9; transform: scale(1.02); }
    .btn-launch-nominas { background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; }
    .btn-launch-nominas:hover { opacity: 0.9; transform: scale(1.02); }

    /* ── Console ── */
    #view-console { justify-content: flex-start; padding: 1.2rem; }

    .console-header {
        width: 100%; display: flex; align-items: center; gap: 0.8rem;
        margin-bottom: 1rem; margin-top: 2.2rem;
    }
    .console-header h2 { font-size: 1.1rem; font-weight: 600; }

    .console-badge {
        padding: 0.2rem 0.7rem; border-radius: 8px;
        font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    }
    .badge-running { background: rgba(78,205,196,0.2); color: #4ecdc4; }
    .badge-done    { background: rgba(78,205,196,0.2); color: #4ecdc4; }
    .badge-error   { background: rgba(245,87,108,0.2); color: #f5576c; }

    #console-output {
        width: 100%; flex: 1;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 1rem 1.2rem;
        font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
        font-size: 0.8rem;
        line-height: 1.6;
        color: rgba(255,255,255,0.8);
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
    }

    /* ── Interactive input bar ── */
    .console-input-bar {
        width: 100%; display: none; gap: 0.5rem; margin-top: 0.6rem; align-items: center;
    }
    .console-input-bar.active { display: flex; }
    .console-input-bar input {
        flex: 1; padding: 0.6rem 1rem;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; color: #fff; font-size: 0.85rem;
        font-family: 'SF Mono', 'Menlo', monospace;
        outline: none;
    }
    .console-input-bar input:focus { border-color: rgba(255,255,255,0.4); }
    .console-input-bar button {
        padding: 0.6rem 1rem; border-radius: 10px; border: none;
        background: rgba(255,255,255,0.15); color: #fff;
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }

    .console-actions {
        width: 100%; display: flex; justify-content: center; gap: 0.8rem;
        margin-top: 1rem; padding-bottom: 1rem;
    }

    .btn {
        padding: 0.6rem 1.4rem; border-radius: 10px; border: none;
        font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn-primary { background: rgba(255,255,255,0.12); color: #fff; }
    .btn-primary:hover { background: rgba(255,255,255,0.22); }
</style>
</head>
<body>

<!-- ═══ MAIN ═══ -->
<div class="view active" id="view-main">
    <h1>Panel de Gestión</h1>
    <p class="subtitle">Selecciona una herramienta para comenzar</p>
    <div class="grid">
        <div class="card" onclick="openHorarios()">
            <div class="icon icon-horarios">&#128197;</div>
            <span class="card-label">Horarios</span>
        </div>
        <div class="card" onclick="showSelector('facturas')">
            <div class="icon icon-facturas">&#128203;</div>
            <span class="card-label">Facturas</span>
        </div>
        <div class="card" onclick="showSelector('nominas')">
            <div class="icon icon-nominas">&#128176;</div>
            <span class="card-label">Nóminas</span>
        </div>
    </div>
</div>

<!-- ═══ SELECTOR ═══ -->
<div class="view" id="view-selector">
    <button class="back" onclick="showView('view-main')">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        Volver
    </button>
    <div class="header-icon" id="sel-icon"></div>
    <div class="selector-title" id="sel-title"></div>
    <p class="selector-sub" id="sel-sub"></p>
    <div class="options">
        <div class="option" onclick="selectEmpresa('kira')">
            <div class="logo logo-kira">K</div>
            <span class="option-name">Kira Market</span>
        </div>
        <div class="option" onclick="selectEmpresa('reypik')">
            <div class="logo logo-reypik">R</div>
            <span class="option-name">Reypik Market</span>
        </div>
    </div>
</div>

<!-- ═══ FORM FACTURAS ═══ -->
<div class="view" id="view-form-facturas">
    <button class="back" onclick="showView('view-selector')">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        Volver
    </button>
    <div class="form-section">
        <div class="header-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c); margin: 0 auto 1rem;">&#128203;</div>
        <div class="form-title" id="form-facturas-title">Facturas</div>
        <p class="form-sub">Introduce el período de búsqueda de facturas</p>
        <div class="field">
            <label>Fecha inicio</label>
            <input type="date" id="fecha-inicio">
        </div>
        <div class="field">
            <label>Fecha fin (vacío = hoy)</label>
            <input type="date" id="fecha-fin">
        </div>
        <button class="btn-launch btn-launch-facturas" onclick="launchFacturas()">Buscar facturas</button>
    </div>
</div>

<!-- ═══ FORM NÓMINAS ═══ -->
<div class="view" id="view-form-nominas">
    <button class="back" onclick="showView('view-selector')">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        Volver
    </button>
    <div class="form-section">
        <div class="header-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe); margin: 0 auto 1rem;">&#128176;</div>
        <div class="form-title" id="form-nominas-title">Nóminas</div>
        <p class="form-sub">Selecciona el PDF y el mes de las nóminas</p>
        <div class="field">
            <label>PDF de nóminas</label>
            <div class="drop-zone" id="drop-zone" onclick="pickPDF()">
                <div>&#128196; Arrastra aquí el PDF o haz clic para seleccionar</div>
            </div>
            <input type="hidden" id="pdf-path">
        </div>
        <div class="field">
            <label>Mes (ej: Febrero_2026)</label>
            <input type="text" id="mes-label" placeholder="Marzo_2026">
        </div>
        <button class="btn-launch btn-launch-nominas" onclick="launchNominas()">Enviar nóminas</button>
    </div>
</div>

<!-- ═══ CONSOLE ═══ -->
<div class="view" id="view-console">
    <button class="back" onclick="showView('view-main')">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        Volver
    </button>
    <div class="console-header">
        <h2 id="console-title">Ejecutando...</h2>
        <span class="console-badge badge-running" id="console-badge">Ejecutando</span>
    </div>
    <div id="console-output"></div>
    <div class="console-input-bar" id="console-input-bar">
        <input type="text" id="console-stdin" placeholder="Escribe aquí..." onkeydown="if(event.key==='Enter') sendStdin()">
        <button onclick="sendStdin()">Enviar</button>
    </div>
    <div class="console-actions">
        <button class="btn btn-primary" onclick="showView('view-main')">Volver al inicio</button>
    </div>
</div>

<script>
    let currentType = '';
    let currentEmpresa = '';
    let pollTimer = null;
    let waitingForInput = false;

    const selConfig = {
        facturas: { icon: '&#128203;', bg: 'linear-gradient(135deg, #f093fb, #f5576c)', title: 'Facturas', sub: 'Selecciona la empresa para gestionar facturas' },
        nominas:  { icon: '&#128176;', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', title: 'Nóminas',  sub: 'Selecciona la empresa para enviar nóminas' }
    };

    function showView(id) {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    function openHorarios() {
        pywebview.api.open_horarios();
    }

    function showSelector(type) {
        currentType = type;
        const c = selConfig[type];
        document.getElementById('sel-icon').innerHTML = c.icon;
        document.getElementById('sel-icon').style.background = c.bg;
        document.getElementById('sel-title').textContent = c.title;
        document.getElementById('sel-sub').textContent = c.sub;
        showView('view-selector');
    }

    function selectEmpresa(empresa) {
        currentEmpresa = empresa;
        const empLabel = empresa === 'kira' ? 'Kira Market' : 'Reypik Market';

        if (currentType === 'facturas') {
            document.getElementById('form-facturas-title').textContent = 'Facturas — ' + empLabel;
            document.getElementById('fecha-inicio').value = '';
            document.getElementById('fecha-fin').value = '';
            showView('view-form-facturas');
        } else {
            document.getElementById('form-nominas-title').textContent = 'Nóminas — ' + empLabel;
            document.getElementById('pdf-path').value = '';
            document.getElementById('mes-label').value = '';
            showView('view-form-nominas');
        }
    }

    function formatDate(isoDate) {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        return d + '/' + m + '/' + y;
    }

    function launchFacturas() {
        const inicio = document.getElementById('fecha-inicio').value;
        if (!inicio) { alert('Introduce la fecha de inicio'); return; }
        const fin = document.getElementById('fecha-fin').value;
        const key = 'facturas_' + currentEmpresa;
        const label = 'Facturas — ' + (currentEmpresa === 'kira' ? 'Kira Market' : 'Reypik Market');

        // stdin: fecha_inicio\nfecha_fin\n
        const stdinText = formatDate(inicio) + '\n' + formatDate(fin) + '\n';
        runWithConsole(key, label, stdinText);
    }

    function setPDFPath(path) {
        path = path.trim().replace(/^['"]|['"]$/g, '');
        document.getElementById('pdf-path').value = path;
        const dz = document.getElementById('drop-zone');
        const name = path.split('/').pop();
        dz.innerHTML = '<div>&#9989; ' + name + '</div>';
        dz.classList.add('has-file');
    }

    function pickPDF() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = function() {
            if (input.files.length > 0) {
                // webkitRelativePath won't have full path; use prompt fallback
                // On macOS pywebview, file inputs don't give full paths
                // So we use the native dialog via Python
                pywebview.api.pick_file().then(function(path) {
                    if (path) setPDFPath(path);
                });
            }
        };
        // Directly use Python native dialog
        pywebview.api.pick_file().then(function(path) {
            if (path) setPDFPath(path);
        });
    }

    // ── Drag & Drop ──
    (function() {
        document.addEventListener('dragover', function(e) { e.preventDefault(); });
        document.addEventListener('drop', function(e) { e.preventDefault(); });

        const dz = document.getElementById('drop-zone');
        if (dz) {
            dz.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.add('dragover');
            });
            dz.addEventListener('dragleave', function(e) {
                e.preventDefault();
                dz.classList.remove('dragover');
            });
            dz.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                dz.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    // In pywebview on macOS, file.name is available but full path
                    // comes via a special property or we read from the file object
                    const file = files[0];
                    // Try to get the path - pywebview/WebKit provides it
                    const path = file.path || file.name;
                    if (path && path.endsWith('.pdf')) {
                        setPDFPath(path);
                    } else {
                        alert('Por favor, arrastra un archivo PDF');
                    }
                }
            });
        }
    })();

    function launchNominas() {
        const pdfPath = document.getElementById('pdf-path').value.trim();
        const mes = document.getElementById('mes-label').value.trim();
        if (!pdfPath) { alert('Selecciona un PDF de nóminas'); return; }
        if (!mes) { alert('Introduce el mes (ej: Febrero_2026)'); return; }
        const key = 'nominas_' + currentEmpresa;
        const label = 'Nóminas — ' + (currentEmpresa === 'kira' ? 'Kira Market' : 'Reypik Market');

        // stdin: pdf_path\nmes\ns\n  (auto-confirm)
        const stdinText = pdfPath + '\n' + mes + '\ns\n';
        runWithConsole(key, label, stdinText);
    }

    function runWithConsole(key, label, stdinText) {
        document.getElementById('console-title').textContent = label;
        document.getElementById('console-badge').textContent = 'Ejecutando';
        document.getElementById('console-badge').className = 'console-badge badge-running';
        document.getElementById('console-output').textContent = '';
        document.getElementById('console-input-bar').classList.remove('active');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-console').classList.add('active');

        pywebview.api.run_script(key, stdinText).then(function() {
            startPolling();
        });
    }

    function sendStdin() {
        const input = document.getElementById('console-stdin');
        const text = input.value;
        input.value = '';
        pywebview.api.send_input(text);
        const el = document.getElementById('console-output');
        el.textContent += '> ' + text + '\n';
        el.scrollTop = el.scrollHeight;
    }

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(function() {
            pywebview.api.poll_output().then(function(raw) {
                const data = JSON.parse(raw);
                const el = document.getElementById('console-output');

                if (data.lines.length > 0) {
                    el.textContent += data.lines.join('\n') + '\n';
                    el.scrollTop = el.scrollHeight;
                }

                if (!data.running) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                    document.getElementById('console-input-bar').classList.remove('active');
                    const badge = document.getElementById('console-badge');
                    if (data.exit_code === 0) {
                        badge.textContent = 'Completado';
                        badge.className = 'console-badge badge-done';
                    } else {
                        badge.textContent = 'Error';
                        badge.className = 'console-badge badge-error';
                    }
                }
            });
        }, 200);
    }
</script>

</body>
</html>
"""

if __name__ == "__main__":
    api = Api()
    window = webview.create_window(
        "Panel de Gestión",
        html=HTML,
        js_api=api,
        width=680,
        height=560,
        resizable=True,
        text_select=True,
    )
    api._window = window
    webview.start(debug=False)
