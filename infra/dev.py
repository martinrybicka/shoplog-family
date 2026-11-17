"""Lokální spuštění bez Dockeru; nový vlastní cluster, žádný import ani demo účet."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if not (ROOT / ".env").exists():
    subprocess.run([sys.executable, "infra/setup_env.py"], check=True)
values = dict(
    line.split("=", 1)
    for line in (ROOT / ".env").read_text().splitlines()
    if line and not line.startswith("#")
)
python = ROOT / "backend/.venv/bin/python"
if not python.exists() or not (ROOT / "frontend/node_modules").exists():
    raise SystemExit(
        "Nejprve spusťte uv sync --project backend --frozen a npm ci --prefix frontend."
    )
for command in ["initdb", "pg_ctl", "createdb", "npm"]:
    if not shutil.which(command):
        raise SystemExit(
            f"Chybí {command}; nainstalujte PostgreSQL 18 a Node 26 podle README."
        )
runtime = ROOT / ".runtime"
runtime.mkdir(exist_ok=True, mode=0o700)
cluster = runtime / "native-postgres"
port = "55440"
web_port = values.get("SHOPLOG_HTTP_PORT", "8090")
env = {
    **os.environ,
    **values,
    "POSTGRES_HOST": "127.0.0.1",
    "POSTGRES_PORT": port,
    "POSTGRES_USER": "shoplog",
    "POSTGRES_DB": "shoplog",
    "PGPASSWORD": values["POSTGRES_PASSWORD"],
    "DJANGO_SETTINGS_MODULE": "config.settings.development",
    "DJANGO_DEBUG": "false",
    "DJANGO_CSRF_TRUSTED_ORIGINS": f"http://localhost:{web_port},http://127.0.0.1:{web_port}",
}
if not cluster.exists():
    password_file = runtime / "init-password"
    descriptor = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "w") as output:
            output.write(values["POSTGRES_PASSWORD"])
        subprocess.run(
            [
                "initdb",
                "-D",
                str(cluster),
                "-U",
                "shoplog",
                "-A",
                "scram-sha-256",
                "--pwfile",
                str(password_file),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
    finally:
        password_file.unlink(missing_ok=True)
status = subprocess.run(
    ["pg_ctl", "-D", str(cluster), "status"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
if status.returncode:
    subprocess.run(
        [
            "pg_ctl",
            "-D",
            str(cluster),
            "-l",
            str(runtime / "native-postgres.log"),
            "-o",
            f"-h 127.0.0.1 -p {port} -k {runtime}",
            "start",
        ],
        check=True,
    )
    result = subprocess.run(
        [
            "psql",
            "-h",
            "127.0.0.1",
            "-p",
            port,
            "-U",
            "shoplog",
            "-d",
            "postgres",
            "-tAc",
            "SELECT 1 FROM pg_database WHERE datname='shoplog'",
        ],
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    if result.stdout.strip() != "1":
        subprocess.run(
            ["createdb", "-h", "127.0.0.1", "-p", port, "-U", "shoplog", "shoplog"],
            env=env,
            check=True,
        )
subprocess.run(
    [str(python), "backend/manage.py", "migrate", "--noinput"], env=env, check=True
)
backend = subprocess.Popen(
    [str(python), "backend/manage.py", "runserver", "127.0.0.1:18092", "--noreload"],
    env=env,
)
frontend = subprocess.Popen(
    ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", web_port],
    cwd=ROOT / "frontend",
    env={
        **env,
        "API_PROXY_TARGET": "http://127.0.0.1:18092",
        "HMR_CLIENT_PORT": web_port,
    },
)
print(
    f"Lokální aplikace: http://localhost:{web_port}. Instalační kód je v .env (SHOPLOG_SETUP_TOKEN).",
    flush=True,
)
try:
    frontend.wait()
except KeyboardInterrupt:
    pass
finally:
    for process in [frontend, backend]:
        process.terminate()
    for process in [frontend, backend]:
        process.wait()
    subprocess.run(["pg_ctl", "-D", str(cluster), "stop", "-m", "fast"], check=False)
