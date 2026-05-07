const jwt = require("jsonwebtoken");
const https = require("http");

const JWT_SECRET = "hospital-saas"; // from .env.local

// Create a test token with doctor role
const testPayload = {
  sub: "550e8400-e29b-41d4-a716-446655440001", // doctorId (valid UUID)
  role: "DOCTOR",
  hospital_id: "550e8400-e29b-41d4-a716-446655440000", // hospitalId
  branch_id: "550e8400-e29b-41d4-a716-446655440002", // branchId
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
};

const token = jwt.sign(testPayload, JWT_SECRET);
console.log("✅ Generated test token:");
console.log(token);
console.log("\n📋 Payload:");
console.log(JSON.stringify(testPayload, null, 2));

// Make the test request
const testRequest = {
  branchId: "550e8400-e29b-41d4-a716-446655440002",
  doctorId: "550e8400-e29b-41d4-a716-446655440001",
  patientId: "550e8400-e29b-41d4-a716-446655440003",
};

console.log("\n📝 Making test request to /api/v1/video-calls/token");
console.log("Request body:", JSON.stringify(testRequest, null, 2));

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/v1/video-calls/token",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
};

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\n📊 Response Status:", res.statusCode);
    console.log("Response Headers:", res.headers);
    try {
      const parsed = JSON.parse(data);
      console.log("\n✅ Response Body:");
      console.log(JSON.stringify(parsed, null, 2));

      // Check for tokens
      if (parsed.data?.caller?.token) {
        console.log("\n🎯 Caller Token Length:", parsed.data.caller.token.length);
        console.log("🎯 Caller Token Preview:", parsed.data.caller.token.substring(0, 50) + "...");
      }
      if (parsed.data?.receiver?.token) {
        console.log("🎯 Receiver Token Length:", parsed.data.receiver.token.length);
        console.log("🎯 Receiver Token Preview:", parsed.data.receiver.token.substring(0, 50) + "...");
      }
    } catch (e) {
      console.log("\n📄 Raw Response:", data);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Error:", error);
});

req.write(JSON.stringify(testRequest));
req.end();
