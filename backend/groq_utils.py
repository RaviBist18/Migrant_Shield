# =============================================================
# FILE: backend/groq_utils.py
# Shared Groq retry wrapper
# =============================================================

import time
from groq import Groq


def groq_chat_with_retry(
    groq: Groq,
    model: str,
    messages: list,
    temperature: float = 0.1,
    max_tokens: int = 4096,
    retries: int = 3,
) -> str:
    for attempt in range(retries):
        try:
            response = groq.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            err = str(e)
            is_rate_limit = "429" in err or "rate_limit" in err.lower() or "too many requests" in err.lower()
            is_timeout = "timeout" in err.lower() or "timed out" in err.lower()
            if is_rate_limit or is_timeout:
                wait = 60 * (attempt + 1)
                reason = "429" if is_rate_limit else "timeout"
                print(f"[groq] {reason} — attempt {attempt + 1}/{retries}, waiting {wait}s", flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"Groq rate limit exceeded after {retries} retries")