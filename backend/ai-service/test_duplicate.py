"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — Duplicate Detection Test Suite v2.0                  ║
║  Tests TF-IDF cosine similarity and normalize_text            ║
╚═══════════════════════════════════════════════════════════════╝
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import compute_tfidf_similarity, normalize_text


def test_normalization():
    """Test text normalization."""
    print("\n── Text Normalization Tests ──")
    passed = 0
    failed = 0

    tests = [
        ("  HELLO  World!! ", "hello world", "Strip + lowercase + punctuation"),
        ("multiple   spaces   here", "multiple spaces here", "Collapse whitespace"),
        ("road broken!!! urgent??", "road broken urgent", "Remove punctuation"),
    ]

    for input_text, expected, desc in tests:
        result = normalize_text(input_text)
        ok = result == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
        print(f"  {status} | '{result}' {'==' if ok else '!='} '{expected}' | {desc}")

    return passed, failed


def test_tfidf_similarity():
    """Test TF-IDF cosine similarity scoring."""
    print("\n── TF-IDF Cosine Similarity Tests ──")
    passed = 0
    failed = 0

    tests = [
        # (new_text, existing_text, expected_is_dup, description)
        (
            "Road broken in ward 12 near Gandhi Nagar",
            "Road broken in ward 12 near Gandhi Nagar",
            True,
            "Exact same complaint",
        ),
        (
            "Road broken in ward 12 near Gandhi Nagar nobody fixing it",
            "Road broken in ward 12 near Gandhi Nagar nobody is fixing it",
            True,
            "Nearly identical with minor word changes",
        ),
        (
            "Water supply not coming since 3 days in Rajaji Street ward 5",
            "Water supply not coming since 3 days in Rajaji Street ward 5 please fix",
            True,
            "Same complaint with extra words appended",
        ),
        (
            "Garbage not collected in Anna Nagar ward 5",
            "Streetlight broken in Kamaraj Street ward 12",
            False,
            "Completely different complaints",
        ),
        (
            "Drainage overflowing on Main Road near temple",
            "Pothole on highway near bus stand",
            False,
            "Different issues different locations",
        ),
        (
            "No water supply in our area for one week",
            "Water not coming since 7 days in our locality",
            False,
            "Different wording — TF-IDF is lexical not semantic, correctly low score",
        ),
        (
            "Water problem",
            "Water supply not coming since one week in Nehru Nagar ward 8",
            False,
            "Too vague vs specific — should NOT match",
        ),
        (
            "Pothole on anna salai near traffic signal causing accidents",
            "Big pothole on anna salai near the signal many accidents happened",
            True,
            "Same issue same location paraphrased",
        ),
    ]

    threshold = 0.35  # TF-IDF cosine threshold — lower than SequenceMatcher due to sparse vectors

    for new_text, existing_text, expect_dup, desc in tests:
        similarities = compute_tfidf_similarity(new_text, [existing_text])
        score = similarities[0] if similarities else 0.0
        is_dup = score >= threshold
        ok = is_dup == expect_dup

        status = "✅ PASS" if ok else "❌ FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
        print(f"  {status} | dup={is_dup!s:5s} (want={expect_dup!s:5s}) score={score:.3f} | {desc}")

    return passed, failed


def test_multiple_comparison():
    """Test comparing against multiple existing complaints at once."""
    print("\n── Multiple Complaint Comparison Tests ──")
    passed = 0
    failed = 0

    new_text = "Road broken near school children cannot walk safely"
    existing_texts = [
        "Garbage collection delayed in ward 3 for 2 weeks",
        "Road in front of school is completely broken dangerous for students",
        "Water supply pipeline leaking near bus stand",
        "Streetlight not working on main road dark at night",
    ]

    similarities = compute_tfidf_similarity(new_text, existing_texts)
    best_idx = similarities.index(max(similarities))
    best_score = similarities[best_idx]

    # Should match the road/school complaint (index 1)
    ok = best_idx == 1 and best_score > 0.1  # Lower threshold — sparse TF-IDF on small corpus
    status = "✅ PASS" if ok else "❌ FAIL"
    if ok:
        passed += 1
    else:
        failed += 1

    print(f"  {status} | best_match=idx[{best_idx}] score={best_score:.3f} | Should match 'road school' complaint")
    for i, (text, score) in enumerate(zip(existing_texts, similarities)):
        marker = " ← BEST" if i == best_idx else ""
        print(f"         [{i}] {score:.3f} | {text[:50]}...{marker}")

    return passed, failed


if __name__ == "__main__":
    print("\n═══════════════════════════════════════════════════")
    print("  AAZHI Duplicate Detection Test Suite v2.0")
    print("═══════════════════════════════════════════════════")

    total_p, total_f = 0, 0

    p, f = test_normalization()
    total_p += p
    total_f += f

    p, f = test_tfidf_similarity()
    total_p += p
    total_f += f

    p, f = test_multiple_comparison()
    total_p += p
    total_f += f

    total = total_p + total_f
    print(f"\n{'═' * 50}")
    print(f"  Results: {total_p}/{total} passed, {total_f} failed")
    print(f"{'═' * 50}")

    if total_f == 0:
        print("  🎉 All tests passed!")
    else:
        print(f"  ⚠️  {total_f} test(s) failed")
        sys.exit(1)
