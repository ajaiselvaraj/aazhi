import Razorpay from "razorpay";

let razorpayInstance = null;

if (
  process.env.RAZORPAY_KEY &&
  process.env.RAZORPAY_SECRET
) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  console.log("✅ Razorpay Initialized");
} else {
  console.log("⚠️ Razorpay keys missing. Payment module running in mock mode.");
}

export default razorpayInstance;