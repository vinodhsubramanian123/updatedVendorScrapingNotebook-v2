'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const WRAPPER_PATH = path.join(PROJECT_ROOT, 'scripts', 'maintenance', 'nlm_windows_mcp.py');

function resolveNlmPython() {
  if (process.platform !== 'win32') return null;
  const toolDir = spawnSync('uv', ['tool', 'dir'], { encoding: 'utf8', windowsHide: true });
  if (toolDir.status !== 0) return null;
  const py = path.join(toolDir.stdout.trim(), 'notebooklm-mcp-cli', 'Scripts', 'python.exe');
  return fs.existsSync(py) ? py : null;
}

test('nlm_windows_mcp.py exists and compiles cleanly', () => {
  assert.ok(fs.existsSync(WRAPPER_PATH), 'nlm_windows_mcp.py must exist');
  const py = resolveNlmPython();
  if (!py) return;
  const res = spawnSync(py, ['-B', '-m', 'py_compile', WRAPPER_PATH], { encoding: 'utf8', windowsHide: true });
  assert.equal(res.status, 0, res.stderr || res.stdout);
});

test('nlm_windows_mcp.py enforces strict ownership, loopback parsing, negative controls, and fast cdp patching', () => {
  const py = resolveNlmPython();
  if (!py) return;

  const script = `
import os, sys, tempfile, types
from pathlib import Path
from unittest import mock

sys.path.insert(0, ${JSON.stringify(path.join(PROJECT_ROOT, 'scripts', 'maintenance'))})
import nlm_windows_mcp as mod

# 1. loopback_listener_pid parses strictly loopback LISTENING only (rejects wildcard, established, other ports)
sample_netstat = (
    b"  TCP    0.0.0.0:18801          0.0.0.0:0              LISTENING       1111\\r\\n"
    b"  TCP    127.0.0.1:18801        127.0.0.1:54321        ESTABLISHED     2222\\r\\n"
    b"  TCP    127.0.0.1:9222         0.0.0.0:0              LISTENING       3333\\r\\n"
    b"  TCP    127.0.0.1:18801        0.0.0.0:0              LISTENING       4444\\r\\n"
)
with mock.patch.object(mod.subprocess, "check_output", return_value=sample_netstat):
    assert mod.loopback_listener_pid(18801) == 4444
    assert mod.loopback_listener_pid(9222) == 3333
    assert mod.loopback_listener_pid(9223) is None

# 2. owns_dedicated_browser positive + negative controls
with tempfile.TemporaryDirectory() as td:
    chrome_exe = Path(td) / "chrome.exe"
    other_exe = Path(td) / "evil.exe"
    prof_a = Path(td) / "default"
    prof_b = Path(td) / "foreign"
    chrome_exe.write_text("", encoding="utf-8")
    other_exe.write_text("", encoding="utf-8")
    prof_a.mkdir()
    prof_b.mkdir()

    valid_cmd = f'"{chrome_exe}" --user-data-dir={prof_a} --remote-debugging-port=18801'
    with mock.patch.object(mod, "_wmi_process_info", return_value=(str(chrome_exe), valid_cmd)):
        assert mod.owns_dedicated_browser(4444, str(prof_a), str(chrome_exe)) is True
        # Negative control: foreign profile MUST be rejected
        assert mod.owns_dedicated_browser(4444, str(prof_b), str(chrome_exe)) is False
        # Negative control: mismatched executable MUST be rejected
        assert mod.owns_dedicated_browser(4444, str(prof_a), str(other_exe)) is False

    # Negative control: duplicate --user-data-dir MUST be rejected
    dup_cmd = f'"{chrome_exe}" --user-data-dir={prof_a} --user-data-dir={prof_b} --remote-debugging-port=18801'
    with mock.patch.object(mod, "_wmi_process_info", return_value=(str(chrome_exe), dup_cmd)):
        assert mod.owns_dedicated_browser(4444, str(prof_a), str(chrome_exe)) is False

    # Negative control: wrong port MUST be rejected
    wrong_port_cmd = f'"{chrome_exe}" --user-data-dir={prof_a} --remote-debugging-port=9222'
    with mock.patch.object(mod, "_wmi_process_info", return_value=(str(chrome_exe), wrong_port_cmd)):
        assert mod.owns_dedicated_browser(4444, str(prof_a), str(chrome_exe)) is False

# 3. dedicated_browser checks headless flag, ws host/path, and writes back port map
wrote = []
fake_cdp = types.SimpleNamespace(
    get_chrome_profile_dir=lambda name: "C:/profile/" + name,
    get_chrome_path=lambda: "C:/chrome.exe",
    _fetch_cdp_version=lambda port, timeout=3: {
        "User-Agent": "Chrome/140.0",
        "webSocketDebuggerUrl": "ws://127.0.0.1:18801/devtools/browser/abc-123",
    },
    _write_port_map=lambda port, profile, pid: wrote.append((port, profile, pid)),
)
with mock.patch.object(mod, "loopback_listener_pid", return_value=4444), \\
     mock.patch.object(mod, "owns_dedicated_browser", return_value=True):
    assert mod.dedicated_browser(fake_cdp, "default", False) == (18801, "ws://127.0.0.1:18801/devtools/browser/abc-123")
    assert wrote == [(18801, "default", 4444)]

# Negative control: headless browser rejected when include_headless=False
fake_cdp._fetch_cdp_version = lambda port, timeout=3: {
    "User-Agent": "HeadlessChrome/140.0",
    "webSocketDebuggerUrl": "ws://127.0.0.1:18801/devtools/browser/abc-123",
}
with mock.patch.object(mod, "loopback_listener_pid", return_value=4444), \\
     mock.patch.object(mod, "owns_dedicated_browser", return_value=True):
    assert mod.dedicated_browser(fake_cdp, "default", False) is None
    assert mod.dedicated_browser(fake_cdp, "default", True) == (18801, "ws://127.0.0.1:18801/devtools/browser/abc-123")

# Negative control: non-loopback ws URL rejected
fake_cdp._fetch_cdp_version = lambda port, timeout=3: {
    "User-Agent": "Chrome/140.0",
    "webSocketDebuggerUrl": "ws://evil.example:18801/devtools/browser/abc-123",
}
with mock.patch.object(mod, "loopback_listener_pid", return_value=4444), \\
     mock.patch.object(mod, "owns_dedicated_browser", return_value=True):
    assert mod.dedicated_browser(fake_cdp, "default", True) is None

# 4. install_browser_discovery patches find_existing_nlm_chrome, _get_process_cmdline, and _listener_pid
from notebooklm_tools.utils import cdp as real_cdp
orig_find = real_cdp.find_existing_nlm_chrome
orig_cmd = real_cdp._get_process_cmdline
orig_pid = real_cdp._listener_pid
mod.install_browser_discovery()
assert real_cdp.find_existing_nlm_chrome is not orig_find
assert real_cdp._get_process_cmdline is not orig_cmd
assert real_cdp._listener_pid is not orig_pid
print("ALL_PYTHON_ASSERTIONS_PASSED")
`;

  const res = spawnSync(py, ['-B', '-c', script], { encoding: 'utf8', windowsHide: true });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /ALL_PYTHON_ASSERTIONS_PASSED/);
});
