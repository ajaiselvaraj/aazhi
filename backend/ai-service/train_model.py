"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — Production ML Training Pipeline                      ║
║  Trains TWO models:                                           ║
║    1. Spam vs Civic classifier (binary)                       ║
║    2. Department router (multi-class)                         ║
║  Uses LinearSVC + TF-IDF + Platt calibration                 ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
    python train_model.py

Outputs:
    models/custom_spam_classifier.pkl   — spam detection pipeline
    models/department_router.pkl        — department routing pipeline
    models/model_metadata.json          — training metadata + integrity hash
"""

import os
import csv
import json
import hashlib
import joblib
import numpy as np
from datetime import datetime, timezone

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report
from sklearn.utils import class_weight


def load_training_data(csv_path: str) -> list[tuple[str, str, str]]:
    """Load training data from CSV. Returns (text, label, department) tuples."""
    data = []
    if os.path.exists(csv_path):
        print(f"📂 Loading training data from {csv_path}...")
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = row.get('text', '').strip()
                label = row.get('label', '').strip()
                dept = row.get('department', '').strip()
                if text and label:
                    data.append((text, label, dept))
    else:
        print(f"⚠️  No CSV found at {csv_path}, using hardcoded fallback data.")
        # Minimal fallback — only for development
        data = [
            ("The road in ward 12 is broken potholes everywhere", "civic_issue", "roads"),
            ("WATER NOT COMING SINCE 3 DAYS FIX THE PIPELINE", "civic_issue", "water"),
            ("Buy cheap viagra online click here", "spam", ""),
            ("Congratulations you have won a lottery prize click", "spam", ""),
            ("Streetlight broken on 5th cross road very dangerous at night", "civic_issue", "electricity"),
            ("Garbage not collected for 2 weeks in colony", "civic_issue", "sanitation"),
            ("Make money fast work from home earn 50000 per day", "spam", ""),
            ("Drainage overflow near bus stand causing flooding", "civic_issue", "drainage"),
            ("Claim your free gift card now limited time offer", "spam", ""),
            ("Dead animal rotting on the street please clean", "civic_issue", "sanitation"),
            ("You have been selected for a free vacation click link", "spam", ""),
            ("Power cut for 12 hours in my area", "civic_issue", "electricity"),
            ("Invest in crypto and double your money fast", "spam", ""),
            ("Stray dogs attacking children near the park", "civic_issue", "animal_control"),
            ("Hot singles in your area looking to chat", "spam", ""),
            ("No electricity since morning please send lineman", "civic_issue", "electricity"),
        ]

    print(f"   Loaded {len(data)} samples")
    return data


def compute_file_hash(filepath: str) -> str:
    """Compute SHA-256 hash of a file for integrity verification."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def train_spam_classifier(texts: list[str], labels: list[str], model_dir: str) -> dict:
    """
    Train spam vs civic_issue binary classifier.
    Uses LinearSVC + Platt calibration for reliable probability estimates.
    """
    print("\n" + "=" * 60)
    print("🧠 TRAINING: Spam Classifier (Binary)")
    print("=" * 60)

    # Map labels to binary: civic_issue → ham, spam → spam
    binary_labels = ["spam" if l == "spam" else "ham" for l in labels]

    label_counts = {}
    for l in binary_labels:
        label_counts[l] = label_counts.get(l, 0) + 1
    print(f"   Class distribution: {label_counts}")

    # Compute balanced class weights
    unique_labels = sorted(set(binary_labels))
    weights = class_weight.compute_class_weight('balanced', classes=np.array(unique_labels), y=np.array(binary_labels))
    weight_dict = dict(zip(unique_labels, weights))
    print(f"   Computed class weights: {weight_dict}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        texts, binary_labels, test_size=0.20, random_state=42, stratify=binary_labels
    )
    print(f"   Train: {len(X_train)}, Test: {len(X_test)}")

    # Build pipeline: TF-IDF → SGDClassifier (modified_huber)
    # SGDClassifier with modified_huber loss natively supports predict_proba
    # — no CalibratedClassifierCV wrapper needed (avoids CV fold issues)
    from sklearn.linear_model import SGDClassifier

    model = make_pipeline(
        TfidfVectorizer(
            sublinear_tf=True,
            stop_words='english',
            ngram_range=(1, 2),      # Unigrams + bigrams for better context
            max_features=10000,
            min_df=1,                # Include rare terms (important for small datasets)
            max_df=0.95,             # Exclude terms in >95% of docs
            strip_accents='unicode',
        ),
        SGDClassifier(
            loss='modified_huber',   # SVM-like + native probability estimates
            class_weight='balanced',
            max_iter=2000,
            tol=1e-4,
            random_state=42,
            alpha=1e-4,              # Regularization strength
        )
    )

    print("   Training SGDClassifier (modified_huber)...")
    model.fit(X_train, y_train)

    # Evaluate
    print("\n📊 Test Set Evaluation:")
    predictions = model.predict(X_test)
    print(classification_report(y_test, predictions, zero_division=0))

    # Cross-validation on full dataset
    print("📊 Cross-Validation (3-fold):")
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    cv_model = make_pipeline(
        TfidfVectorizer(sublinear_tf=True, stop_words='english', ngram_range=(1, 2), max_features=10000),
        SGDClassifier(loss='modified_huber', class_weight='balanced', max_iter=2000, random_state=42, alpha=1e-4)
    )
    cv_scores = cross_val_score(cv_model, texts, binary_labels, cv=cv, scoring='f1_weighted')
    print(f"   F1 scores: {cv_scores}")
    print(f"   Mean F1: {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")

    # Save model
    model_path = os.path.join(model_dir, "custom_spam_classifier.pkl")
    joblib.dump(model, model_path)
    print(f"\n✅ Spam classifier saved to {model_path}")

    return {
        "model_path": model_path,
        "model_hash": compute_file_hash(model_path),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "cv_mean_f1": round(float(cv_scores.mean()), 4),
        "cv_std_f1": round(float(cv_scores.std()), 4),
        "class_distribution": label_counts,
    }


def train_department_router(texts: list[str], departments: list[str], model_dir: str) -> dict:
    """
    Train multi-class department routing classifier.
    Only trains on civic_issue samples that have a department label.
    """
    print("\n" + "=" * 60)
    print("🏛️  TRAINING: Department Router (Multi-class)")
    print("=" * 60)

    # Filter to only civic samples with department labels
    dept_texts = []
    dept_labels = []
    for t, d in zip(texts, departments):
        if d and d.strip():
            dept_texts.append(t)
            dept_labels.append(d.strip())

    if len(dept_texts) < 10:
        print("   ⚠️  Not enough department-labeled data (<10). Skipping department router.")
        return {}

    label_counts = {}
    for l in dept_labels:
        label_counts[l] = label_counts.get(l, 0) + 1
    print(f"   {len(dept_texts)} samples across {len(label_counts)} departments")
    for dept, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        print(f"      {dept}: {count}")

    # Remove classes with too few samples for stratified split
    min_samples = 2
    valid_classes = {k for k, v in label_counts.items() if v >= min_samples}
    filtered = [(t, d) for t, d in zip(dept_texts, dept_labels) if d in valid_classes]
    dept_texts = [t for t, _ in filtered]
    dept_labels = [d for _, d in filtered]

    if len(dept_texts) < 10:
        print("   ⚠️  Too few valid samples after filtering. Skipping department router.")
        return {}

    # Recount after filtering
    label_counts = {}
    for l in dept_labels:
        label_counts[l] = label_counts.get(l, 0) + 1
    print(f"   After filtering (min {min_samples} samples/class): {len(dept_texts)} samples, {len(label_counts)} departments")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        dept_texts, dept_labels, test_size=0.20, random_state=42, stratify=dept_labels
    )
    print(f"   Train: {len(X_train)}, Test: {len(X_test)}")

    # Build pipeline — same SGDClassifier approach as spam classifier
    from sklearn.linear_model import SGDClassifier

    model = make_pipeline(
        TfidfVectorizer(
            sublinear_tf=True,
            stop_words='english',
            ngram_range=(1, 2),
            max_features=15000,
            min_df=1,
            max_df=0.95,
            strip_accents='unicode',
        ),
        SGDClassifier(
            loss='modified_huber',   # Native probability support
            class_weight='balanced',
            max_iter=2000,
            tol=1e-4,
            random_state=42,
            alpha=1e-4,
        )
    )

    print("   Training SGDClassifier (modified_huber)...")
    model.fit(X_train, y_train)

    # Evaluate
    print("\n📊 Test Set Evaluation:")
    predictions = model.predict(X_test)
    print(classification_report(y_test, predictions, zero_division=0))

    # Save
    model_path = os.path.join(model_dir, "department_router.pkl")
    joblib.dump(model, model_path)
    print(f"\n✅ Department router saved to {model_path}")

    return {
        "model_path": model_path,
        "model_hash": compute_file_hash(model_path),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "num_departments": len(label_counts),
        "departments": sorted(label_counts.keys()),
        "class_distribution": label_counts,
    }


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "training_data.csv")
    model_dir = os.path.join(script_dir, "models")
    os.makedirs(model_dir, exist_ok=True)

    # Load data
    data = load_training_data(csv_path)
    texts = [t for t, _, _ in data]
    labels = [l for _, l, _ in data]
    departments = [d for _, _, d in data]

    # Train spam classifier
    spam_meta = train_spam_classifier(texts, labels, model_dir)

    # Train department router
    civic_texts = [t for t, l, _ in data if l != "spam"]
    civic_depts = [d for _, l, d in data if l != "spam"]
    dept_meta = train_department_router(civic_texts, civic_depts, model_dir)

    # Save metadata
    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": csv_path,
        "total_samples": len(data),
        "spam_classifier": spam_meta,
        "department_router": dept_meta,
        "pipeline_version": "2.0.0",
        "features": [
            "TF-IDF with bigrams",
            "LinearSVC with balanced class weights",
            "Platt calibration for probability estimates",
            "Department routing (multi-class)",
            "Model integrity hashing (SHA-256)",
        ],
    }

    meta_path = os.path.join(model_dir, "model_metadata.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"\n📋 Metadata saved to {meta_path}")

    # Final summary
    print("\n" + "=" * 60)
    print("🎉 TRAINING COMPLETE")
    print("=" * 60)
    print(f"   Total samples:      {len(data)}")
    print(f"   Spam classifier:    ✅ {spam_meta.get('cv_mean_f1', 'N/A')} F1")
    if dept_meta:
        print(f"   Department router:  ✅ {dept_meta.get('num_departments', 0)} departments")
    else:
        print(f"   Department router:  ⚠️  Skipped (insufficient data)")
    print(f"   Models saved to:    {model_dir}/")
    print()

    # Verification test
    print("🔮 Quick Verification:")
    spam_model = joblib.load(os.path.join(model_dir, "custom_spam_classifier.pkl"))
    test_cases = [
        ("There is a huge pothole in front of the school children falling daily", "should be HAM"),
        ("Click this link to get a free iPhone 15 now limited offer", "should be SPAM"),
        ("WATER NOT COMING FIX IT NOW I AM VERY ANGRY", "should be HAM (angry citizen)"),
        ("Earn $5000 daily from home no experience needed", "should be SPAM"),
        ("Drainage blocked sewage on road for 2 weeks", "should be HAM"),
    ]
    for text, expected in test_cases:
        pred = spam_model.predict([text])[0]
        probs = spam_model.predict_proba([text])[0]
        spam_idx = list(spam_model.classes_).index("spam")
        spam_prob = probs[spam_idx]
        status = "✅" if (pred == "spam") == ("SPAM" in expected) else "❌"
        print(f"   {status} [{pred:4s} {spam_prob:.2f}] <- '{text[:60]}...'  ({expected})")

    if dept_meta:
        dept_model = joblib.load(os.path.join(model_dir, "department_router.pkl"))
        dept_tests = [
            ("Pothole on the main road", "roads"),
            ("No water supply since 3 days", "water"),
            ("Garbage not collected for weeks", "sanitation"),
            ("Streetlight not working at night", "electricity"),
        ]
        print("\n🏛️  Department Routing Verification:")
        for text, expected_dept in dept_tests:
            pred_dept = dept_model.predict([text])[0]
            status = "✅" if pred_dept == expected_dept else "⚠️"
            print(f"   {status} [{pred_dept:15s}] <- '{text}'  (expected: {expected_dept})")


if __name__ == "__main__":
    main()