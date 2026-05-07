const jwt = require("jsonwebtoken");
const http = require("http");

const JWT_SECRET = "hospital-saas"; // from .env.local

// Real IDs from database
const doctorId = "e6568518-96a2-4ad5-a1c1-12a23ffa1f88";
const patientId = "ad973520-c7bd-4243-a095-f6874a7ed20e";
const hospitalId = "721f5ad8-f395-4489-8f8c-20ed554b34bd";
const branchId = "708d5094-a8c1-451e-8a96-fca3f15cff5d";

// Create a test token with patient role (making the request)
// Using correct JWT field names: sub (not userId), hospital_id (not hospitalId), etc.
const testPayload = {
  sub: patientId,  // This becomes userId in authContext
  role: "PATIENT",
  hospital_id: hospitalId,  // This becomes hospitalId in authContext
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
  branchId: branchId,
  doctorId: doctorId,
  patientId: patientId,
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

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\n📊 Response Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("\n✅ Response Body:");
      console.log(JSON.stringify(parsed, null, 2));

      // Check for tokens
      if (parsed.data?.caller?.token) {
        console.log("\n🎯 SUCCESS! Caller Token Generated:");
        console.log("   Token Length:", parsed.data.caller.token.length);
        console.log("   Token Preview:", parsed.data.caller.token.substring(0, 80) + "...");
      } else {
        console.log("\n❌ Caller Token is MISSING or EMPTY");
      }
      
      if (parsed.data?.receiver?.token) {
        console.log("\n🎯 SUCCESS! Receiver Token Generated:");
        console.log("   Token Length:", parsed.data.receiver.token.length);
        console.log("   Token Preview:", parsed.data.receiver.token.substring(0, 80) + "...");
      } else {
        console.log("\n❌ Receiver Token is MISSING or EMPTY");
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
