#!/usr/bin/env python3
"""Upload the commerce Worker to Cloudflare. No Node, no wrangler, stdlib only.

    python3 tools/deploy_worker.py             upload it
    python3 tools/deploy_worker.py --dry-run   print what would be sent; needs no tokens, sends nothing

Reads worker/commerce.jsonc and worker/commerce.js (one file, no imports), uploads it as a module, attaches commerce-worker.situs.id and turns the
workers.dev address off. Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, from .env here or ../.env (the values are never printed).
"""
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get("CLOUDFLARE_API_BASE", "https://api.cloudflare.com/client/v4")


def load_env():
    for f in (ROOT / ".env", ROOT.parent / ".env", ROOT.parent / "chat-learning" / ".env"):  # the first file that has a value wins
        if f.exists():
            for line in f.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def read_config():
    # the .jsonc file only has whole-line // comments, so this is enough.
    text = (ROOT / "worker" / "commerce.jsonc").read_text(encoding="utf-8")
    return json.loads("\n".join(l for l in text.splitlines() if not l.strip().startswith("//")))


def call(token, method, path, body=None):
    req = urllib.request.Request(
        f"{BASE}{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "commerce-deploy/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read())
        except Exception:
            return {"success": False, "errors": [{"message": f"HTTP {e.code}"}]}


def main():
    dry = "--dry-run" in sys.argv[1:]
    load_env()
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not dry and (not token or not account):
        sys.exit("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env")
    cfg = read_config()
    code = (ROOT / "worker" / cfg["main"]).read_text(encoding="utf-8")
    if "import " in code.replace("// ", ""):
        sys.exit("worker code must be one file without imports")

    bindings = [{"type": "ratelimit", "name": r["name"], "namespace_id": r["namespace_id"], "simple": r["simple"]} for r in cfg.get("ratelimits", [])]
    bindings += [{"type": "plain_text", "name": k, "text": v} for k, v in cfg.get("vars", {}).items()]
    metadata = {"main_module": cfg["main"], "compatibility_date": cfg["compatibility_date"], "bindings": bindings, "keep_bindings": ["secret_text"]}
    if cfg.get("placement"):
        metadata["placement"] = cfg["placement"]

    if dry:
        print(f"Would upload worker '{cfg['name']}' to https://{cfg['domain']}/")
        print(f"  module {cfg['main']}: {len(code.encode('utf-8'))} bytes")
        print(f"  bindings: {', '.join(b['name'] for b in bindings)}")
        return

    boundary = uuid.uuid4().hex
    body = b""
    for name, filename, ctype, content in (("metadata", None, "application/json", json.dumps(metadata)), (cfg["main"], cfg["main"], "application/javascript+module", code)):
        disp = f'form-data; name="{name}"' + (f'; filename="{filename}"' if filename else "")
        body += f"--{boundary}\r\nContent-Disposition: {disp}\r\nContent-Type: {ctype}\r\n\r\n{content}\r\n".encode("utf-8")
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{BASE}/accounts/{account}/workers/scripts/{cfg['name']}", data=body, method="PUT", headers={
        "Authorization": f"Bearer {token}", "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "commerce-deploy/1.0",  # Cloudflare blocks the default Python user agent
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            payload = json.loads(res.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"Deploy failed: HTTP {e.code}\n{e.read().decode('utf-8', 'replace')[:500]}")
    if not payload.get("success"):
        sys.exit(f"Deploy failed: {payload.get('errors')}")
    print(f"Deployed worker '{cfg['name']}'.")

    domain = cfg["domain"]
    zones = call(token, "GET", f"/zones?name={'.'.join(domain.split('.')[-2:])}").get("result") or []
    if zones:
        res = call(token, "PUT", f"/accounts/{account}/workers/domains",
                   {"hostname": domain, "service": cfg["name"], "environment": "production", "zone_id": zones[0]["id"]})
        print(f"Domain https://{domain}/ -> {cfg['name']}" if res.get("success") else f"Domain {domain} NOT attached: {res.get('errors')}")
    else:
        print(f"Domain {domain}: the token cannot read its zone; attach it in the dashboard.")
    off = call(token, "POST", f"/accounts/{account}/workers/scripts/{cfg['name']}/subdomain", {"enabled": False})
    print("workers.dev address off" if off.get("success") else f"workers.dev not changed ({(off.get('errors') or [{}])[0].get('message')})")


if __name__ == "__main__":
    main()
