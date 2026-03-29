"""Quick verification tests for the smart spam classifier."""

from main import smart_classify, has_civic_context, count_spam_signals

tests = [
    # (text, model_label, model_score, expected_spam, description)
    ("The road in ward 12 is broken potholes everywhere nobody is fixing it", "LABEL_1", 0.92, False, "Angry citizen about roads"),
    ("WATER NOT COMING SINCE 3 DAYS FIX THE PIPELINE IMMEDIATELY", "LABEL_1", 0.88, False, "Angry citizen about water"),
    ("Buy cheap viagra online click here http://spam.com free offer limited time", "LABEL_1", 0.97, True, "Classic spam"),
    ("Congratulations you have won a lottery prize click http://scam.link", "LABEL_1", 0.95, True, "Scam message"),
    ("Streetlight broken on 5th cross road very dangerous at night", "LABEL_0", 0.96, False, "Legit infrastructure complaint"),
    ("Garbage not collected for 2 weeks in colony causing health hazard", "LABEL_0", 0.94, False, "Legit sanitation complaint"),
    ("asdf jkl qwerty zxcv random keys pressed no meaning at all", "LABEL_1", 0.70, False, "Gibberish - low ML confidence, fail-open"),
    ("This municipality is useless nobody cares about citizens rights", "LABEL_1", 0.85, False, "Frustrated citizen venting"),
    ("Make money fast work from home earn 50000 per day guaranteed", "LABEL_1", 0.93, True, "Money scam spam"),
    ("Drainage overflow near bus stand causing flooding every rain", "LABEL_0", 0.91, False, "Legit drainage complaint"),
]

passed = 0
failed = 0

for text, label, score, expected, desc in tests:
    result = smart_classify(text, label, score)
    is_pass = result["is_spam"] == expected
    status = "PASS" if is_pass else "FAIL"

    if is_pass:
        passed += 1
    else:
        failed += 1

    print(f"  {status} | spam={result['is_spam']!s:5s} (want={expected!s:5s}) | {result['classification']:15s} | {desc}")

print(f"\n  Results: {passed}/{len(tests)} passed, {failed} failed")

if failed == 0:
    print("  All tests passed!")
else:
    print(f"  WARNING: {failed} test(s) failed")
