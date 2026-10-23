#!/usr/bin/env python3
"""Launch Flutter with a selected API. Read only PORT from backend/.env."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION_URL = "https://pinbind.bcmenu.ro"


def choose(title, labels):
    print("\n" + title, flush=True)
    for index, label in enumerate(labels, 1):
        print(f"  {index}. {label}")
    while True:
        value = input("Alege numărul (Enter = 1, q = ieșire): ").strip()
        if value.lower() == "q":
            raise SystemExit(0)
        if not value:
            return 0
        if value.isdigit() and 1 <= int(value) <= len(labels):
            return int(value) - 1
        print("Alegere invalidă.")


def local_port():
    path = ROOT / "backend/.env"
    if path.exists():
        for line in path.read_text().splitlines():
            match = re.fullmatch(r'\s*(?:export\s+)?PORT\s*=\s*[\'\"]?(\d+)[\'\"]?\s*(?:#.*)?', line)
            if match:
                return int(match[1])
    return 3000


def flutter_json(flutter, command):
    result = subprocess.run([flutter, command, "--machine"], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout)


def available_emulators(flutter):
    emulators = []
    if sys.platform == "darwin" and shutil.which("xcrun"):
        result = subprocess.run(["xcrun", "simctl", "list", "devices", "available", "--json"], text=True, capture_output=True)
        if result.returncode == 0:
            for runtime, devices in json.loads(result.stdout).get("devices", {}).items():
                if ".iOS-" in runtime:
                    for device in devices:
                        if device.get("isAvailable"):
                            emulators.append({"id": device["udid"], "name": device["name"] + " — " + runtime.rsplit(".", 1)[-1], "ios": True, "state": device["state"]})
    # Flutter's emulators command has a text table, not a --machine option.
    result = subprocess.run([flutter, "emulators"], cwd=ROOT, text=True, capture_output=True)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            columns = [column.strip() for column in line.split(" • ")]
            if len(columns) == 4 and columns[0] != "Id":
                if columns[0] == "apple_ios_simulator" and any(item.get("ios") for item in emulators):
                    continue
                emulators.append({"id": columns[0], "name": columns[1]})
    return emulators


def mobile_devices(flutter):
    return [device for device in flutter_json(flutter, "devices")
            if device.get("isSupported", True)
            and (device.get("targetPlatform", "").startswith("android")
                 or device.get("targetPlatform") == "ios")]



def show_ios_simulator(device_id):
    developer = Path(subprocess.check_output(["xcode-select", "-p"], text=True).strip())
    for app in (developer / "Applications/Simulator.app", developer.parent / "Applications/Simulator.app"):
        if app.exists():
            subprocess.run(["open", "-a", str(app), "--args", "-CurrentDeviceUDID", device_id], check=True)
            return
    device_hub = developer.parent / "Applications/DeviceHub.app"
    if device_hub.exists():
        subprocess.run(["open", str(device_hub)], check=True)
        return
    print("Simulatorul este pornit. Deschide fereastra dispozitivului din Xcode dacă nu apare automat.")


def select_device(flutter, device_id):
    print("Caut telefoanele și simulatoarele disponibile…", flush=True)
    devices = mobile_devices(flutter)
    if device_id:
        for device in devices:
            if device["id"] == device_id:
                return device
        raise RuntimeError("Dispozitivul cerut nu este disponibil. Verifică flutter devices.")
    if not devices:
        emulators = available_emulators(flutter)
        if not emulators:
            raise RuntimeError("Conectează un telefon sau creează un simulator iOS/emulator Android, apoi rulează din nou.")
        selected = emulators[choose("Pornește un simulator/emulator:", [item["name"] for item in emulators])]
        if selected.get("ios"):
            if selected["state"] != "Booted":
                subprocess.run(["xcrun", "simctl", "boot", selected["id"]], check=True)
            show_ios_simulator(selected["id"])
        else:
            subprocess.run([flutter, "emulators", "--launch", selected["id"]], cwd=ROOT, check=True)
        for _ in range(30):
            devices = mobile_devices(flutter)
            if devices:
                break
            time.sleep(2)
        if not devices:
            raise RuntimeError("Simulatorul încă pornește. Așteaptă să se deschidă și rulează scriptul din nou.")
    index = choose("Pe ce dispozitiv pornim aplicația?", [
        f'{item["name"]} ({item["targetPlatform"]}; {"simulator/emulator" if item.get("emulator") else "telefon fizic"})'
        for item in devices
    ])
    return devices[index]


def lan_address():
    if sys.platform == "darwin":
        for interface in ("en0", "en1"):
            result = subprocess.run(["/usr/sbin/ipconfig", "getifaddr", interface], capture_output=True, text=True)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
    return ""


def api_host(device, override):
    if override:
        host = override
    elif device.get("emulator"):
        host = "10.0.2.2" if device["targetPlatform"].startswith("android") else "localhost"
    else:
        default = lan_address()
        print("Telefonul și calculatorul trebuie să fie în aceeași rețea Wi-Fi.")
        host = input(f"IP-ul LAN al calculatorului{f' [{default}]' if default else ''}: ").strip() or default
    parsed = urlsplit("http://" + host)
    if not host or parsed.hostname != host or parsed.username or parsed.port or parsed.path or parsed.query or parsed.fragment:
        raise RuntimeError("Introdu doar IP-ul sau numele calculatorului, fără http://, port sau cale.")
    return host


def listening(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def start_backend(port):
    if listening(port):
        print(f"Folosesc backend-ul deja pornit pe portul {port}.", flush=True)
        return None, None
    answer = input(f"Backend-ul local nu răspunde pe portul {port}. Îl pornesc? [D/n]: ").strip().lower()
    if answer not in ("", "d", "da", "y", "yes"):
        raise RuntimeError("Pornește backend-ul local și rulează din nou scriptul.")
    cli = ROOT / "backend/node_modules/@nestjs/cli/bin/nest.js"
    node = shutil.which("node")
    if not cli.exists() or not node:
        raise RuntimeError("Instalează Node.js și rulează npm ci în backend înainte de pornire.")
    descriptor, log_path = tempfile.mkstemp(prefix="pinbind-backend-", suffix=".log")
    log = os.fdopen(descriptor, "w")
    process = subprocess.Popen([node, str(cli), "start", "--watch"], cwd=ROOT / "backend",
                               env={**os.environ, "PORT": str(port)}, stdout=log, stderr=subprocess.STDOUT,
                               start_new_session=True)
    print(f"Pornesc backend-ul. Loguri: {log_path}", flush=True)
    try:
        for _ in range(60):
            if process.poll() is not None:
                raise RuntimeError(f"Backend-ul nu a pornit. Verifică {log_path}")
            if listening(port):
                return process, log
            time.sleep(1)
        raise RuntimeError(f"Backend-ul nu a răspuns în 60 secunde. Verifică {log_path}")
    except BaseException:
        stop_backend(process, log)
        raise


def stop_backend(process, log):
    if process:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
        except ProcessLookupError:
            pass
    if log:
        log.close()


def main():
    parser = argparse.ArgumentParser(description="Pornește Pinbind cu backend local sau producție.")
    parser.add_argument("--backend", choices=["local", "production"])
    parser.add_argument("--device", help="ID exact din flutter devices")
    parser.add_argument("--local-host", help="IP/nume calculator pentru backend-ul local")
    parser.add_argument("--port", type=int, help="Implicit: PORT din backend/.env, altfel 3000")
    parser.add_argument("--dry-run", action="store_true", help="Afișează comanda fără pornirea aplicației/backend-ului")
    args = parser.parse_args()
    flutter = shutil.which("flutter")
    if not flutter:
        raise RuntimeError("Flutter nu este în PATH. Adaugă directorul flutter/bin în PATH.")
    backend = args.backend or ["local", "production"][choose("Alege backend-ul:", ["Local (pe acest calculator)", f"Producție — {PRODUCTION_URL}"])]
    device = select_device(flutter, args.device)
    port = None
    if backend == "production":
        url = PRODUCTION_URL
    else:
        port = args.port if args.port is not None else local_port()
        if not 1 <= port <= 65535:
            raise RuntimeError("Portul trebuie să fie între 1 și 65535.")
        url = f"http://{api_host(device, args.local_host)}:{port}"
    command = [flutter, "run", "--debug", "-d", device["id"], f"--dart-define=API_BASE_URL={url}"]
    print(f"\nBackend ales: {url}", flush=True)
    print("Comandă: " + " ".join(command), flush=True)
    if args.dry_run:
        return 0
    if sys.platform == "darwin" and device.get("emulator") and device["targetPlatform"] == "ios":
        show_ios_simulator(device["id"])
    process, log = None, None
    try:
        if port is not None:
            process, log = start_backend(port)
        return subprocess.call(command, cwd=ROOT)
    finally:
        stop_backend(process, log)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"\nEroare: {error}", file=sys.stderr)
        sys.exit(1)
    except (KeyboardInterrupt, EOFError):
        print("\nPornire oprită.")
        sys.exit(130)
