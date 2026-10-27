"""ai-router: route LLM requests across legitimately configured providers.

Only official APIs, user-owned keys, legitimate free tiers and local models are
used. Rate limits and quotas are honoured: a limited provider is put on
cooldown and the request moves to the next configured provider; it is never
retried around the limit.
"""

__version__ = "1.0.0"
