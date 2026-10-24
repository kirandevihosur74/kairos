"""Voice notes: speech-to-text through the OpenAI transcriptions API.

Audio is forwarded once for transcription and never stored. The transcript is returned for the user
to review and edit; nothing is saved as a meeting note until they submit it through POST /met.
"""

import json
import re
import urllib.error
import urllib.request
from uuid import uuid4

TRANSCRIBE_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions"
MAX_AUDIO = 10 * 1024 * 1024
# Formats the transcriptions API accepts; browsers record webm (Chrome/Android) or mp4/m4a (iOS Safari).
AUDIO_TYPES = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}


class TranscriptionError(Exception):
    pass


def extension(filename, content_type):
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    if ext in AUDIO_TYPES:
        return ext
    subtype = (content_type or "").split(";")[0].split("/")[-1].lower()
    return {"x-m4a": "m4a", "mp4a-latm": "m4a", "x-wav": "wav", "wave": "wav"}.get(subtype, subtype)


def transcribe(audio, ext, settings):
    """Returns the transcript text. Raises TranscriptionError on any provider problem."""
    boundary = uuid4().hex
    parts = [
        f'--{boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n{settings.openai_transcribe_model}\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n'.encode(),
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="note.{ext}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n".encode(),
        audio,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    request = urllib.request.Request(
        TRANSCRIBE_ENDPOINT,
        data=b"".join(parts),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {settings.openai_api_key}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=max(settings.openai_timeout, 60)) as response:
            data = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        raise TranscriptionError(f"OpenAI HTTP {exc.code}") from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        raise TranscriptionError(type(exc).__name__) from None
    text = data.get("text") if isinstance(data, dict) else None
    if not isinstance(text, str):
        raise TranscriptionError("Unexpected OpenAI response")
    return text.strip()


def mentioned(text, people):
    """People named in the transcript: full name, or a first name only one person at the event has."""
    lowered = text.casefold()

    def said(phrase):
        return bool(phrase) and re.search(r"(?<!\w)" + re.escape(phrase.casefold()) + r"(?!\w)", lowered)

    firsts = {}
    for p in people:
        firsts.setdefault(p["name"].split()[0].casefold(), []).append(p)
    found = []
    for p in people:
        first = p["name"].split()[0]
        if said(p["name"]) or (len(firsts[first.casefold()]) == 1 and len(first) > 2 and said(first)):
            found.append(p)
    return found
