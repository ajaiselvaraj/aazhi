import os
import sys
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from configs.settings import DUPLICATE_THRESHOLD
from utils.helpers import clean_text

def detect_duplicate(text: str, existing_complaints: list, threshold: float = DUPLICATE_THRESHOLD) -> dict:
    """Compare a new complaint description against existing tickets using Cosine Similarity."""
    if not existing_complaints or len(existing_complaints) == 0:
        return {
            "is_duplicate": False,
            "similarity": 0.0,
            "matched_ticket": None,
            "reason": "No historical complaints provided for comparison."
        }
        
    cleaned_new = clean_text(text)
    if not cleaned_new:
        return {
            "is_duplicate": False,
            "similarity": 0.0,
            "matched_ticket": None,
            "reason": "Empty description text."
        }
        
    # Prepare text list
    texts = [cleaned_new]
    ticket_numbers = []
    
    for c in existing_complaints:
        c_text = f"{c.get('subject', '')} {c.get('description', '')}".strip()
        texts.append(clean_text(c_text))
        ticket_numbers.append(c.get('ticket_number', 'Unknown-TKT'))
        
    try:
        # Fit vectorizer on the small set of texts
        vectorizer = TfidfVectorizer(max_features=500)
        tfidf_matrix = vectorizer.fit_transform(texts)
        
        # Calculate cosine similarity of target (index 0) against all others
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
        
        best_idx = similarities.argmax()
        best_score = float(similarities[best_idx])
        matched_ticket = ticket_numbers[best_idx]
        
        is_duplicate = best_score >= threshold
        
        if is_duplicate:
            reason = f"Highly similar to ticket {matched_ticket} with similarity of {round(best_score * 100, 1)}%."
        else:
            reason = f"Unique complaint. Maximum match score: {round(best_score * 100, 1)}%."
            
        return {
            "is_duplicate": is_duplicate,
            "similarity": round(best_score, 4),
            "matched_ticket": matched_ticket if is_duplicate else None,
            "reason": reason
        }
    except Exception as e:
        print(f"Error executing duplicate check: {e}")
        return {
            "is_duplicate": False,
            "similarity": 0.0,
            "matched_ticket": None,
            "reason": f"Similarity engine error: {e}"
        }
