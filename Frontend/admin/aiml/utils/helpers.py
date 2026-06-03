import re

# Simple set of common stop words to keep it lightweight and offline-friendly
STOP_WORDS = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'to',
    'and', 'or', 'but', 'if', 'while', 'because', 'as', 'until', 'since',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
    'her', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these', 'those',
    'please', 'sir', 'madam', 'complaint', 'issue', 'problem', 'help'
}

def clean_text(text: str) -> str:
    """Lowercase text and strip non-alphanumeric characters."""
    if not text:
        return ""
    text = text.lower()
    # Remove punctuation but keep letters, digits, and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text.strip()

def tokenize(text: str) -> list:
    """Clean, tokenize, and remove stop words."""
    cleaned = clean_text(text)
    words = cleaned.split()
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]

def extract_keywords(text: str, max_words: int = 5) -> list:
    """Extract most frequent tokens as simple keywords."""
    tokens = tokenize(text)
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    sorted_tokens = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [t[0] for t in sorted_tokens[:max_words]]

def calculate_caps_ratio(text: str) -> float:
    """Helper to check percentage of uppercase characters (indicates shouting/anger)."""
    if not text:
        return 0.0
    letters = re.sub(r'[^a-zA-Z]', '', text)
    if not letters:
        return 0.0
    caps = sum(1 for c in letters if c.isupper())
    return caps / len(letters)
