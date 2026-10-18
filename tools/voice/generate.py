"""Synthesizes the clips listed by phrases.mjs (JSON on stdin) with Microsoft's
neural voices via edge-tts, into <out>/<lang>/*.mp3, and writes <out>/index.json
({lang: {text: file}}) for say() in app.js. Only new or changed clips are
synthesized; clips no longer listed are deleted.

Usage: node phrases.mjs | python generate.py <out-dir> [--force]
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICES = {'pt': 'pt-PT-RaquelNeural', 'en': 'en-US-AvaNeural'}
RATE = '-10%'  # a touch slower than the voices' default, for small kids
CONCURRENCY = 8


async def synth(sem, entry, path, voice):
    async with sem:
        for attempt in range(4):
            try:
                tmp = path.with_suffix('.part')
                await edge_tts.Communicate(entry['spoken'], voice, rate=RATE).save(str(tmp))
                tmp.replace(path)
                return
            except Exception as e:  # network hiccups / throttling: back off and retry
                if attempt == 3:
                    raise RuntimeError(f"{entry['text']!r}: {e}") from e
                await asyncio.sleep(2 ** attempt)


async def main():
    out = Path(sys.argv[1])
    force = '--force' in sys.argv
    phrases = json.load(sys.stdin)
    sources_file = out / '.sources.json'  # file → what it was synthesized from (dotfile: nginx won't serve it)
    old_sources = json.loads(sources_file.read_text()) if sources_file.exists() else {}
    sources, index, jobs = {}, {}, []
    sem = asyncio.Semaphore(CONCURRENCY)
    for lang, entries in phrases.items():
        (out / lang).mkdir(parents=True, exist_ok=True)
        index[lang] = {}
        for e in entries:
            src = f"{VOICES[lang]}|{RATE}|{e['spoken']}"
            path = out / e['file']
            sources[e['file']] = src
            index[lang][e['text']] = e['file']
            if force or not path.exists() or old_sources.get(e['file']) != src:
                jobs.append(synth(sem, e, path, VOICES[lang]))
    print(f'synthesizing {len(jobs)} of {len(sources)} clips…', file=sys.stderr)
    await asyncio.gather(*jobs)
    for f in out.glob('*/*.mp3'):
        if f.relative_to(out).as_posix() not in sources:
            f.unlink()
    sources_file.write_text(json.dumps(sources, ensure_ascii=False, indent=0))
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')))
    print(f'✓ {len(sources)} clips in {out}', file=sys.stderr)


asyncio.run(main())
