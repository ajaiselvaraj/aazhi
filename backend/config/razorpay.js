import Razorpay from "razorpay";

let razorpayInstance = null;

if (
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET
) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log("✅ Razorpay Initialized");
} else {
  console.log("⚠️ Razorpay keys missing. Payment module running in mock mode.");
}

export default razorpayInstance;