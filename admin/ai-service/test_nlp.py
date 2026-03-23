"""
Quick test script for the NLP classification and sentiment analysis endpoints.
Run with:  python test_nlp.py             (requires AI service running on port 5000)
         python test_nlp.py --unit-only  (offline unit tests, no server needed)
"""

import sys
import json

# ─── Offline Unit Tests (no server needed) ──────────────────
def run_unit_tests():
    """Test the classify_complaint and analyze_sentiment functions directly."""
    # Import from main.py
    sys.path.insert(0, ".")
    from main import classify_complaint, analyze_sentiment

    print("=" * 60)
    print("  UNIT TESTS -- Classification Engine")
    print("=" * 60)

    # Test 1: Water complaint
    r = classify_complaint("There is no water supply in our area for 3 days. The pipeline is broken.")
    print(f"\n[PASS] Water complaint:")
    print(f"   Dept: {r['department']}  Priority: {r['priority']}  Confidence: {r['confidence']}%")
    print(f"   Keywords: {r['keywords_matched']}")
    assert r["department"] == "Water Supply Department", f"Expected Water, got {r['department']}"
    assert r["priority"] in ("High", "Critical"), f"Expected High/Critical, got {r['priority']}"

    # Test 2: Electricity complaint
    r = classify_complaint("Power cut in ward 45 since yesterday. Streetlights are also not working.")
    print(f"\n[PASS] Electricity complaint:")
    print(f"   Dept: {r['department']}  Priority: {r['priority']}  Confidence: {r['confidence']}%")
    assert r["department"] == "Electricity Department", f"Expected Electricity, got {r['department']}"

    # Test 3: Gas emergency
    r = classify_complaint("EMERGENCY: Gas leak in building 12, children at risk! Please send help immediately!")
    print(f"\n[PASS] Gas emergency:")
    print(f"   Dept: {r['department']}  Priority: {r['priority']}  Confidence: {r['confidence']}%")
    assert r["department"] == "Gas Distribution", f"Expected Gas, got {r['department']}"
    assert r["priority"] == "Critical", f"Expected Critical, got {r['priority']}"

    # Test 4: Municipal / garbage
    r = classify_complaint("Garbage is piling up in our colony. The dustbins are overflowing. Terrible smell.")
    print(f"\n[PASS] Municipal complaint:")
    print(f"   Dept: {r['department']}  Priority: {r['priority']}  Confidence: {r['confidence']}%")
    assert r["department"] == "Municipal Services", f"Expected Municipal, got {r['department']}"

    # Test 5: Ambiguous complaint (no clear department)
    r = classify_complaint("Everything is terrible in this city. Nothing works properly.")
    print(f"\n[PASS] Ambiguous complaint (fallback):")
    print(f"   Dept: {r['department']}  Priority: {r['priority']}  Confidence: {r['confidence']}%")
    assert r["department"] == "Municipal Services", f"Expected Municipal fallback, got {r['department']}"

    print("\n" + "=" * 60)
    print("  UNIT TESTS -- Sentiment Analysis")
    print("=" * 60)

    # Test 6: Angry sentiment
    r = analyze_sentiment("THIS IS USELESS!!! THE WORST SERVICE EVER! PATHETIC AND INCOMPETENT OFFICIALS!")
    print(f"\n[PASS] Angry text:")
    print(f"   Sentiment: {r['sentiment']}  Urgency: {r['urgency']}/5  Caps: {r['caps_ratio']}")
    print(f"   Tone: {r['tone_indicators']}")
    assert r["sentiment"] == "Angry", f"Expected Angry, got {r['sentiment']}"

    # Test 7: Frustrated sentiment
    r = analyze_sentiment("I'm very frustrated and disappointed. Nobody cares about our complaints. Still waiting.")
    print(f"\n[PASS] Frustrated text:")
    print(f"   Sentiment: {r['sentiment']}  Urgency: {r['urgency']}/5")
    print(f"   Tone: {r['tone_indicators']}")
    assert r["sentiment"] == "Frustrated", f"Expected Frustrated, got {r['sentiment']}"

    # Test 8: Positive sentiment
    r = analyze_sentiment("Thank you for resolving the water issue. Great work by the team. Very satisfied.")
    print(f"\n[PASS] Positive text:")
    print(f"   Sentiment: {r['sentiment']}  Urgency: {r['urgency']}/5")
    assert r["sentiment"] == "Positive", f"Expected Positive, got {r['sentiment']}"

    # Test 9: Neutral
    r = analyze_sentiment("The water pipe near our house has a small issue. Please look into it.")
    print(f"\n[PASS] Neutral text:")
    print(f"   Sentiment: {r['sentiment']}  Urgency: {r['urgency']}/5")
    assert r["sentiment"] == "Neutral", f"Expected Neutral, got {r['sentiment']}"

    # Test 10: High urgency
    r = analyze_sentiment("We need help IMMEDIATELY! There is a gas leak and it is life threatening!")
    print(f"\n[PASS] Emergency urgency:")
    print(f"   Sentiment: {r['sentiment']}  Urgency: {r['urgency']}/5")
    assert r["urgency"] >= 4, f"Expected urgency >= 4, got {r['urgency']}"

    print("\n" + "=" * 60)
    print("  ALL UNIT TESTS PASSED")
    print("=" * 60)


# ─── API Integration Tests (requires running server) ────────
def run_api_tests():
    """Test the actual HTTP endpoints."""
    import requests

    BASE = "http://localhost:5000"

    print("=" * 60)
    print("  API TESTS -- Classification Endpoint")
    print("=" * 60)

    # Classify
    resp = requests.post(f"{BASE}/api/ai/classify-complaint", json={
        "text": "Power cut in ward 45 since yesterday evening. All streetlights are off."
    })
    data = resp.json()
    print(f"\n>> POST /api/ai/classify-complaint")
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {json.dumps(data, indent=2)}")
    assert resp.status_code == 200
    assert data["success"] is True
    assert data["data"]["department"] == "Electricity Department"

    print("\n" + "=" * 60)
    print("  API TESTS -- Sentiment Endpoint")
    print("=" * 60)

    # Sentiment
    resp = requests.post(f"{BASE}/api/ai/analyze-sentiment", json={
        "text": "THIS IS PATHETIC!!! NO WATER FOR 5 DAYS! USELESS OFFICIALS!"
    })
    data = resp.json()
    print(f"\n>> POST /api/ai/analyze-sentiment")
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {json.dumps(data, indent=2)}")
    assert resp.status_code == 200
    assert data["success"] is True
    assert data["data"]["sentiment"] == "Angry"

    print("\n" + "=" * 60)
    print("  ALL API TESTS PASSED")
    print("=" * 60)


if __name__ == "__main__":
    if "--unit-only" in sys.argv:
        run_unit_tests()
    elif "--api-only" in sys.argv:
        run_api_tests()
    else:
        run_unit_tests()
        print("\n\n")
        try:
            run_api_tests()
        except Exception as e:
            print(f"\n[WARN] API tests skipped (server not running?): {e}")
            print("   Start the AI service first:  python main.py")