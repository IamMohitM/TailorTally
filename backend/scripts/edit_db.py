import os
import sys
import webbrowser
import threading
import time
import subprocess
import socket

def wait_for_server(host, port, timeout=5):
    """Wait for the server to be responsive."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.2)
    return False

def open_browser(url):
    """Open browser after a slight delay to ensure server is ready."""
    # Wait a bit proactively, then check socket
    time.sleep(1.5) 
    print(f"Opening browser at {url}...")
    webbrowser.open(url)

def main():
    # Determine paths
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
    DB_PATH = os.path.join(BACKEND_DIR, "tailor_tally.db")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    HOST = "127.0.0.1"
    PORT = 8080
    URL = f"http://{HOST}:{PORT}"

    print(f"Starting sqlite-web for {DB_PATH}...")
    print(f"Access the editor at {URL}")
    print("Press Ctrl+C to stop.")

    # Start browser opener in a separate thread
    threading.Thread(target=open_browser, args=(URL,), daemon=True).start()

    # Run sqlite_web
    # We use subprocess.call or similar to run the command, but since sqlite_web 
    # might be installed as a script or module, running it via 'python -m sqlite_web' is safest if available,
    # or just calling the executable. Since we are in the venv, 'sqlite_web' should work.
    
    cmd = ["sqlite_web", DB_PATH, "--host", HOST, "--port", str(PORT), "--no-browser"]
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nStopping editor...")
    except FileNotFoundError:
        print("Error: sqlite_web not found. Is it installed?")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
