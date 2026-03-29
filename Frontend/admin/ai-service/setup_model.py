#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════╗
║  AAZHI — AI Service: Model Download Script                   ║
║  Downloads the spam-filter model weights ONCE for local use. ║
║  Run this before building Docker or running the service.     ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
    python setup_model.py

This downloads ~17 MB of model weights into ./models/spam-filter/
After running, the service operates fully offline.
"""

import os
import sys


def main():
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
    except ImportError:
        print("❌ Missing dependencies. Install with:")
        print("   pip install transformers torch")
        sys.exit(1)

    model_name = "mrm8488/bert-tiny-finetuned-sms-spam-detection"
    save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "spam-filter")

    print(f"📥 Downloading model: {model_name}")
    print(f"📂 Target directory:  {save_path}")
    print()

    os.makedirs(save_path, exist_ok=True)

    print("⏳ Downloading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.save_pretrained(save_path)
    print("✅ Tokenizer saved.")

    print("⏳ Downloading model weights...")
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.save_pretrained(save_path)
    print("✅ Model weights saved.")

    # Verify
    files = os.listdir(save_path)
    total_size = 0
    print(f"\n📦 Saved {len(files)} files to {save_path}:")
    for f in sorted(files):
        size_mb = os.path.getsize(os.path.join(save_path, f)) / (1024 * 1024)
        total_size += size_mb
        print(f"   {f} ({size_mb:.1f} MB)")

    print(f"\n   Total: {total_size:.1f} MB")
    print("\n🎉 Model setup complete! You can now run the AI service offline.")
    print("   Next steps:")
    print("   1. docker-compose build ai-service")
    print("   2. docker-compose up ai-service")


if __name__ == "__main__":
    main()
