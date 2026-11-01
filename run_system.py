import os
import sys
import subprocess
import time
import signal
import socket

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def main():
    print("=" * 72)
    print(" SELFHEAL STORAGE: DISTRIBUTED FILE SYSTEM WITH PREDICTIVE SELF-HEALING")
    print("=" * 72)

    backend_port = 8001
    frontend_port = 5173

    if is_port_in_use(backend_port):
        print(f"[!] Warning: Port {backend_port} is currently in use.")
    else:
        print(f"[*] Port {backend_port} verified available for backend.")

    print(f"\n[1/2] Starting FastAPI Backend on http://localhost:{backend_port} ...")

    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = os.path.join(os.path.dirname(__file__), "backend")

    backend_cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", str(backend_port),
        "--reload"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=os.path.join(os.path.dirname(__file__), "backend"),
        env=backend_env
    )

    # Wait for backend to be ready
    for _ in range(20):
        time.sleep(0.5)
        if is_port_in_use(backend_port):
            break

    print(f"[2/2] Starting Vite Frontend on http://localhost:{frontend_port} ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=os.path.join(os.path.dirname(__file__), "frontend")
    )

    time.sleep(1.5)

    print("\n" + "=" * 72)
    print(" >> SYSTEM ONLINE & READY!")
    print(f" >> Web Dashboard: http://localhost:{frontend_port}")
    print(f" >> Backend API:   http://localhost:{backend_port}")
    print(f" >> API Swagger:   http://localhost:{backend_port}/docs")
    print(" >> Press Ctrl+C in this terminal to shut down both services.")
    print("=" * 72 + "\n")

    def signal_handler(sig, frame):
        print("\nShutting down SelfHeal Storage services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
