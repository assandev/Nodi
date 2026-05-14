import threading
from typing import Optional

from faster_whisper import WhisperModel

from app.core.config import settings


class TranscriptionError(Exception):
    pass


_model: Optional[WhisperModel] = None
_model_lock = threading.Lock()
_init_lock = threading.Lock()


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        with _init_lock:
            if _model is None:
                _model = WhisperModel(
                    settings.WHISPER_MODEL_SIZE,
                    device="cpu",
                    compute_type="int8",
                )
    return _model


def transcribe_audio(file_path: str) -> str:
    try:
        model = _get_model()
        with _model_lock:
            segments, _ = model.transcribe(file_path, beam_size=5)
            return " ".join(s.text.strip() for s in segments).strip()
    except Exception as exc:
        raise TranscriptionError(str(exc)) from exc
