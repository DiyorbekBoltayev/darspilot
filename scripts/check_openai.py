"""OpenAI ulanishini tekshirish: kalit, mavjud modellar va bitta sinov chaqiruvi.

Ishga tushirish:  .venv\\Scripts\\python scripts\\check_openai.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import config  # noqa: E402


def main():
    if not config.OPENAI_API_KEY:
        print("OPENAI_API_KEY topilmadi. Loyiha papkasida .env fayl yarating (.env.example dan nusxa oling).")
        return 1
    from openai import OpenAI

    client = OpenAI(api_key=config.OPENAI_API_KEY, timeout=60)
    print("Akkauntda mavjud GPT modellari:")
    try:
        ids = sorted(m.id for m in client.models.list() if m.id.startswith(("gpt", "o")))
        for mid in ids:
            mark = "  <- .env dagi OPENAI_MODEL" if mid == config.OPENAI_MODEL else (
                "  <- .env dagi OPENAI_MODEL_FAST" if mid == config.OPENAI_MODEL_FAST else "")
            print("  ", mid, mark)
        for name, mid in (("OPENAI_MODEL", config.OPENAI_MODEL), ("OPENAI_MODEL_FAST", config.OPENAI_MODEL_FAST)):
            if mid not in ids:
                print(f"DIQQAT: {name}={mid} bu ro'yxatda yo'q — .env da mavjud modelni yozing.")
    except Exception as e:
        print("Modellar ro'yxatini olishda xato:", e)

    for mid in (config.OPENAI_MODEL, config.OPENAI_MODEL_FAST):
        t0 = time.time()
        try:
            r = client.chat.completions.create(
                model=mid,
                messages=[{"role": "system", "content": "Faqat JSON qaytar."},
                          {"role": "user", "content": "O'zbek tilida bitta qisqa gap yoz: {\"gap\": \"...\"}"}],
                response_format={"type": "json_object"},
            )
            data = json.loads(r.choices[0].message.content)
            print(f"{mid}: OK ({time.time() - t0:.1f} s) ->", data)
        except Exception as e:
            print(f"{mid}: XATO ->", type(e).__name__, str(e)[:300])
    return 0


if __name__ == "__main__":
    sys.exit(main())
