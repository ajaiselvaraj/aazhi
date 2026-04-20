"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — Comprehensive Classifier Test Suite v2.0             ║
║  Tests smart_classify, rule_based_classify, civic detection,  ║
║  spam signals, and regional language handling.                 ║
╚═══════════════════════════════════════════════════════════════╝
"""

from main import (
    smart_classify,
    rule_based_classify,
    has_civic_context,
    count_spam_signals,
    detect_language_mix,
    keyword_based_routing,
)


def run_section(title: str, tests: list, test_fn) -> tuple[int, int]:
    """Run a section of tests and return (passed, failed)."""
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")
    p, f = 0, 0
    for test in tests:
        result = test_fn(test)
        if result:
            p += 1
        else:
            f += 1
    return p, f


def main():
    total_passed = 0
    total_failed = 0

    # ═══════════════════════════════════════════════════════
    # TEST 1: Smart Classify — Core Logic
    # ═══════════════════════════════════════════════════════
    smart_tests = [
        # (text, model_label, model_score, expected_spam, description)
        # Angry citizens — MUST NOT be flagged
        ("The road in ward 12 is broken potholes everywhere nobody is fixing it", "spam", 0.92, False, "Angry citizen about roads"),
        ("WATER NOT COMING SINCE 3 DAYS FIX THE PIPELINE IMMEDIATELY", "spam", 0.88, False, "Angry citizen about water (ALL CAPS)"),
        ("THIS GOVERNMENT IS USELESS ROAD IS BROKEN FOR 6 MONTHS", "spam", 0.85, False, "Frustrated citizen venting"),
        ("WHEN WILL YOU FIX THE DRAINAGE ITS BEEN 3 MONTHS OF FLOODING", "spam", 0.86, False, "Angry drainage complaint"),
        ("I WILL COMPLAIN TO THE CHIEF MINISTER IF THIS ROAD IS NOT FIXED", "spam", 0.80, False, "Threatening but legitimate"),
        ("We are humans not animals we deserve clean water and working roads", "spam", 0.75, False, "Emotional but legitimate"),

        # Clear spam — MUST be flagged
        ("Buy cheap viagra online click here http://spam.com free offer limited time", "spam", 0.97, True, "Classic pharma spam"),
        ("Congratulations you have won a lottery prize click http://scam.link", "spam", 0.95, True, "Lottery scam"),
        ("Make money fast work from home earn 50000 per day guaranteed", "spam", 0.93, True, "Work from home scam"),
        ("Click this link to get a free iPhone 15 now limited offer", "spam", 0.91, True, "Free iPhone scam"),
        ("You have been selected for $1000 gift card click link to claim", "spam", 0.94, True, "Gift card scam"),

        # Legitimate complaints — model says ham
        ("Streetlight broken on 5th cross road very dangerous at night", "ham", 0.96, False, "Legit infrastructure complaint"),
        ("Garbage not collected for 2 weeks in colony causing health hazard", "ham", 0.94, False, "Legit sanitation complaint"),
        ("Drainage overflow near bus stand causing flooding every rain", "ham", 0.91, False, "Legit drainage complaint"),
        ("Bridge near school is in dangerous condition children at risk", "ham", 0.89, False, "Legit safety complaint"),

        # Edge cases
        ("asdf jkl qwerty zxcv random keys pressed no meaning at all", "spam", 0.70, False, "Gibberish — low confidence, fail-open"),
        ("This municipality is useless nobody cares about citizens rights", "spam", 0.74, False, "Frustrated citizen — below threshold"),
    ]

    def test_smart(t):
        text, label, score, expected, desc = t
        result = smart_classify(text, label, score)
        ok = result["is_spam"] == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | spam={result['is_spam']!s:5s} (want={expected!s:5s}) | {result['classification']:18s} | {desc}")
        if not ok:
            print(f"         Reason: {result['reason']}")
        return ok

    p, f = run_section("SMART CLASSIFY TESTS", smart_tests, test_smart)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # TEST 2: Rule-Based Fallback
    # ═══════════════════════════════════════════════════════
    fallback_tests = [
        # (text, expected_spam, description)
        ("Road broken pothole ward 12 nobody fixing it", False, "Civic complaint (rule-based)"),
        ("Buy viagra click here free offer lottery winner casino", True, "Spam-loaded text (rule-based)"),
        ("Hello world", False, "Neutral text — should pass through"),
        ("Water problem in colony garbage not collected drainage blocked", False, "Multi-issue civic complaint"),
    ]

    def test_fallback(t):
        text, expected, desc = t
        result = rule_based_classify(text)
        ok = result["is_spam"] == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | spam={result['is_spam']!s:5s} (want={expected!s:5s}) | {desc}")
        return ok

    p, f = run_section("RULE-BASED FALLBACK TESTS", fallback_tests, test_fallback)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # TEST 3: Civic Context Detection
    # ═══════════════════════════════════════════════════════
    civic_tests = [
        ("Road pothole broken dangerous", True, "Road complaint"),
        ("Water supply pipeline not working", True, "Water complaint"),
        ("Hello world nothing here", False, "No civic context"),
        ("Buy sell trade stocks money", False, "Financial — not civic"),
        ("Garbage electricity drainage sewage broken", True, "Multi-keyword civic"),
    ]

    def test_civic(t):
        text, expected, desc = t
        is_civic, count = has_civic_context(text)
        ok = is_civic == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | civic={is_civic!s:5s} (want={expected!s:5s}) count={count} | {desc}")
        return ok

    p, f = run_section("CIVIC CONTEXT DETECTION", civic_tests, test_civic)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # TEST 4: Spam Signal Detection
    # ═══════════════════════════════════════════════════════
    spam_signal_tests = [
        ("Click here http://spam.com free offer", 3, "URL + CTA + free"),
        ("Normal complaint about road repair", 0, "No spam signals"),
        ("Casino lottery winner prize click now", 2, "Gambling + lottery"),
        ("Earn $50000 work from home daily", 2, "Earnings + work from home"),
    ]

    def test_spam_signals(t):
        text, min_expected, desc = t
        count = count_spam_signals(text)
        ok = count >= min_expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | signals={count} (want>={min_expected}) | {desc}")
        return ok

    p, f = run_section("SPAM SIGNAL DETECTION", spam_signal_tests, test_spam_signals)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # TEST 5: Regional Language Detection
    # ═══════════════════════════════════════════════════════
    lang_tests = [
        ("kudiNeer varala pannunga romba difficult", "tamil_transliteration", "Tamil complaint"),
        ("paani nahi aa raha koi dhyan nahi de raha", "hindi_transliteration", "Hindi complaint"),
        ("Road broken pothole dangerous area", "english", "English complaint"),
    ]

    def test_lang(t):
        text, expected, desc = t
        detected = detect_language_mix(text)
        ok = detected == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | lang={detected:25s} (want={expected:25s}) | {desc}")
        return ok

    p, f = run_section("REGIONAL LANGUAGE DETECTION", lang_tests, test_lang)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # TEST 6: Keyword-Based Department Routing
    # ═══════════════════════════════════════════════════════
    routing_tests = [
        ("Pothole on main road broken since months", "roads", "Road complaint"),
        ("Water supply not coming pipeline broken", "water", "Water complaint"),
        ("Garbage not collected dirty smell", "sanitation", "Sanitation complaint"),
        ("Transformer burst power cut area", "electricity", "Electricity complaint"),
        ("Drainage blocked sewage flooding", "drainage", "Drainage complaint"),
        ("Stray dogs attacking children park", "animal_control", "Animal control"),
        ("Traffic signal not working junction", "traffic", "Traffic issue"),
    ]

    def test_routing(t):
        text, expected, desc = t
        dept = keyword_based_routing(text)
        ok = dept == expected
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status} | dept={dept:18s} (want={expected:18s}) | {desc}")
        return ok

    p, f = run_section("KEYWORD DEPARTMENT ROUTING", routing_tests, test_routing)
    total_passed += p
    total_failed += f

    # ═══════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════
    total = total_passed + total_failed
    print(f"\n{'═' * 60}")
    print(f"  RESULTS: {total_passed}/{total} passed, {total_failed} failed")
    print(f"{'═' * 60}")

    if total_failed == 0:
        print("  🎉 ALL TESTS PASSED!")
    else:
        print(f"  ⚠️  {total_failed} test(s) failed — review above")
        exit(1)


if __name__ == "__main__":
    main()
