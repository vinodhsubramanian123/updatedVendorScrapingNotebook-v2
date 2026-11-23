"""Start the installed NotebookLM MCP with Windows dedicated-browser discovery."""

import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit


DEDICATED_PORT = 18801


def loopback_listener_pid(port=DEDICATED_PORT):
    # The remote endpoint on a listening IPv4 socket is always 0.0.0.0:0.
    # Matching both endpoints excludes established connections and wildcard binds.
    output = subprocess.check_output(
        [str(Path(os.environ["SystemRoot"]) / "System32" / "netstat.exe"), "-ano", "-p", "tcp"],
        timeout=5, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    local = f"127.0.0.1:{int(port)}".encode()
    for line in output.splitlines():
        fields = line.split()
        if len(fields) == 5 and fields[:3] == [b"TCP", local, b"0.0.0.0:0"]:
            return int(fields[-1])
    return None


def _wmi_process_info(pid):
    import pythoncom
    import win32com.client

    # MCP can run tools on worker threads. Initialize COM on the calling thread.
    pythoncom.CoInitialize()
    proc = None
    try:
        proc = win32com.client.GetObject("winmgmts:").Get(f'Win32_Process.Handle="{int(pid)}"')
        return proc.ExecutablePath, proc.CommandLine
    finally:
        proc = None  # Release the WMI object before closing this COM apartment.
        pythoncom.CoUninitialize()


def process_cmdline(pid):
    try:
        from pywintypes import com_error
    except ImportError:
        return None
    try:
        _, cmdline = _wmi_process_info(pid)
        return cmdline.strip() if cmdline else None
    except (ImportError, OSError, ValueError, TypeError, com_error):
        return None


def owns_dedicated_browser(pid, profile_dir, browser_exe):
    import win32api

    exe_path, cmdline = _wmi_process_info(pid)
    if not exe_path or not cmdline or not os.path.samefile(exe_path, browser_exe):
        return False
    args = win32api.CommandLineToArgv(cmdline)
    profiles = [s.partition("=")[2] for s in args if s.startswith("--user-data-dir=")]
    ports = [s.partition("=")[2] for s in args if s.startswith("--remote-debugging-port=")]
    return len(profiles) == 1 and ports == [str(DEDICATED_PORT)] and os.path.samefile(profiles[0], profile_dir)


def dedicated_browser(cdp, profile_name, include_headless):
    try:
        from pywintypes import com_error
    except ImportError:
        return None

    try:
        pid = loopback_listener_pid(DEDICATED_PORT)
        if not pid or not owns_dedicated_browser(pid, cdp.get_chrome_profile_dir(profile_name), cdp.get_chrome_path()):
            return None
        info = cdp._fetch_cdp_version(DEDICATED_PORT, timeout=3) or {}
        if not include_headless and "Headless" in info.get("User-Agent", ""):
            return None
        url = info.get("webSocketDebuggerUrl", "")
        endpoint = urlsplit(url)
        if (endpoint.scheme == "ws" and endpoint.hostname in ("localhost", "127.0.0.1")
                and endpoint.port == DEDICATED_PORT and endpoint.path.startswith("/devtools/browser/")
                and loopback_listener_pid(DEDICATED_PORT) == pid):
            try:
                cdp._write_port_map(DEDICATED_PORT, profile_name, pid)
            except Exception:
                pass
            return DEDICATED_PORT, url
    except (ImportError, OSError, ValueError, TypeError, subprocess.SubprocessError, com_error):
        pass
    return None


def install_browser_discovery():
    from notebooklm_tools.utils import cdp

    native_find = cdp.find_existing_nlm_chrome
    native_cmdline = cdp._get_process_cmdline
    native_listener = cdp._listener_pid

    def fast_cmdline(pid):
        cmd = process_cmdline(pid)
        return cmd if cmd is not None else native_cmdline(pid)

    def fast_listener(port):
        try:
            pid = loopback_listener_pid(port)
            if pid is not None:
                return pid
        except (OSError, ValueError, subprocess.SubprocessError):
            pass
        return native_listener(port)

    def find_browser(port_range=cdp.CDP_PORT_RANGE, profile_name="default", include_headless=False):
        found = dedicated_browser(cdp, profile_name, include_headless)
        if found:
            return found
        return native_find(port_range=port_range, profile_name=profile_name, include_headless=include_headless)

    cdp._get_process_cmdline = fast_cmdline
    cdp._listener_pid = fast_listener
    cdp.find_existing_nlm_chrome = find_browser


if __name__ == "__main__":
    install_browser_discovery()
    from notebooklm_tools.mcp.server import main

    main()
