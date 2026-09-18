"""HTML slaydlarni PDF ga aylantiradi (headless Edge, CDP Page.printToPDF).

Ishlatish:  python taqdimot/src/build_pdf.py [fayl.html ...]
Argument berilmasa — src papkasidagi barcha *.html.
"""
import base64
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9412

files = [pathlib.Path(a) for a in sys.argv[1:]] or sorted(SRC.glob("*.html"))
if not files:
    print("HTML fayl topilmadi")
    sys.exit(1)

profile = tempfile.mkdtemp()
proc = subprocess.Popen(
    [EDGE, "--headless=new", f"--remote-debugging-port={PORT}", "--remote-allow-origins=*",
     f"--user-data-dir={profile}", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
     "--allow-file-access-from-files", "--hide-scrollbars", "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(80):
        try:
            tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
            page = next(t for t in tabs if t.get("type") == "page")
            break
        except Exception:
            time.sleep(0.25)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180, suppress_origin=True)
    mid = 0

    def cmd(method, **params):
        global mid
        mid += 1
        ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    cmd("Page.enable")
    cmd("Runtime.enable")
    cmd("Network.enable")
    cmd("Network.setCacheDisabled", cacheDisabled=True)     # CSS/shrift keshda qolib ketmasin
    import time as _t
    for html in files:
        url = "file:///" + str(html.resolve()).replace("\\", "/")

        cmd("Page.navigate", url=url)
        time.sleep(1.0)
        # shriftlar (Google Fonts) yuklanmaguncha kutamiz — aks holda PDF ga Segoe UI tushib qoladi
        ready = False
        for _ in range(30):
            probe = cmd("Runtime.evaluate", expression=(
                "document.fonts.status === 'loaded' && document.fonts.check('600 46px Unbounded')"
                " && document.fonts.check('16px Onest')"), returnByValue=True)
            if probe.get("result", {}).get("value"):
                ready = True
                break
            time.sleep(0.5)
        if not ready:
            print("  DIQQAT: shriftlar yuklanmadi — internetni tekshiring, PDF standart shrift bilan chiqadi")
        time.sleep(float(os.environ.get("WAIT", "1.0")))
        data = cmd("Page.printToPDF", printBackground=True, preferCSSPageSize=False,
                   paperWidth=13.3333, paperHeight=7.5,
                   marginTop=0, marginBottom=0, marginLeft=0, marginRight=0,
                   scale=1, landscape=False)["data"]
        pdf = OUT / (html.stem + ".pdf")
        blob = base64.b64decode(data)
        try:
            pdf.write_bytes(blob)
        except PermissionError:                      # fayl ochiq turgan bo'lsa — yonida yangi nusxa
            pdf = OUT / (html.stem + "_yangi.pdf")
            pdf.write_bytes(blob)
            print(f"  e'tibor: {html.stem}.pdf ochiq — {pdf.name} sifatida saqlandi")
        print(f"{html.name} -> {pdf.name}  ({pdf.stat().st_size // 1024} KB)")
    ws.close()
finally:
    proc.terminate()
