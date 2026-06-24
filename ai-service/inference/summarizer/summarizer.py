import os
import sys
import re
from sklearn.feature_extraction.text import TfidfVectorizer

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from utils.helpers import clean_text

def summarize_texts(texts: list, max_sentences: int = 3) -> str:
    """Generate a concise extractive summary from a list of complaint descriptions using TF-IDF Sentence Ranking."""
    # Filter empty texts
    cleaned_texts = [t.strip() for t in texts if t and len(t.strip()) > 5]
    
    if not cleaned_texts:
        return "No descriptive complaints available to summarize."
        
    if len(cleaned_texts) == 1:
        return cleaned_texts[0]
        
    # Step 1: Split all texts into individual sentences
    sentences = []
    for text in cleaned_texts:
        # Split by periods, question marks, or exclamation marks followed by spaces
        split_sents = re.split(r'(?<=[.!?])\s+', text)
        for s in split_sents:
            s_clean = s.strip()
            if len(s_clean) > 8 and s_clean not in sentences:
                sentences.append(s_clean)
                
    if len(sentences) <= max_sentences:
        return " ".join(sentences)
        
    try:
        # Step 2: Fit TF-IDF on cleaned sentences to compute token weights
        cleaned_sents = [clean_text(s) for s in sentences]
        
        vectorizer = TfidfVectorizer(max_features=200)
        tfidf_matrix = vectorizer.fit_transform(cleaned_sents)
        
        # Step 3: Score each sentence by summing its TF-IDF token weights
        sentence_scores = []
        for i in range(len(sentences)):
            row = tfidf_matrix[i].toarray()[0]
            # Sum up positive weights
            score = sum(w for w in row if w > 0)
            sentence_scores.append((score, i, sentences[i]))
            
        # Step 4: Sort by score descending and select top N
        # We also keep track of original order to maintain chronological readability
        top_sents = sorted(sentence_scores, key=lambda x: x[0], reverse=True)[:max_sentences]
        # Sort selected sentences back to their original index order
        top_sents_ordered = sorted(top_sents, key=lambda x: x[1])
        
        summary = " ".join(s[2] for s in top_sents_ordered)
        return summary
    except Exception as e:
        print(f"Summarizer error: {e}")
        # Fallback to taking first sentences of top complaints
        return " ".join(sentences[:max_sentences])
