"""
Quick test for the duplicate detection endpoint.
Tests similarity computation + the /check-duplicate API logic.
"""

import sys
import os

# Add the AI service directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import compute_similarity, normalize_text

def test_similarity():
    """Test the similarity scoring function."""
    passed = 0
    failed = 0

    tests = [
        # (text_a, text_b, expected_is_dup, description)
        (
            "Road broken in ward 12 near Gandhi Nagar",
            "Road broken in ward 12 near Gandhi Nagar",
            True,
            "Exact same complaint",
        ),
        (
            "Road broken in ward 12 near Gandhi Nagar nobody fixing it",
            "Road broken in ward 12 near Gandhi Nagar nobody is fixing it!!!",
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
            "Different issues, different locations",
        ),
        (
            "Water problem",
            "Water supply not coming since one week in Nehru Nagar ward 8",
            False,
            "Too vague vs specific — should NOT match",
        ),
    ]

    for text_a, text_b, expect_dup, desc in tests:
        score = compute_similarity(text_a, text_b)
        is_dup = score >= 0.70
        status = "PASS" if is_dup == expect_dup else "FAIL"
        if status == "PASS":
            passed += 1
        else:
            failed += 1
        print(f"  {status} | dup={is_dup} (score={score:.2f}) | {desc}")

    print(f"\n  Results: {passed}/{passed + failed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    print("\n=== Duplicate Detection Tests ===\n")
    ok = test_similarity()
    if ok:
        print("  All tests passed!\n")
    else:
        print("  SOME TESTS FAILED\n")
        sys.exit(1)
