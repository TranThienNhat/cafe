import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"[*] Smart Coffee Backend RESTful API running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
