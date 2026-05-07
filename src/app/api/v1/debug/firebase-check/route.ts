import { NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";

export async function GET() {
  const logs: string[] = [];

  try {
    logs.push("1. Checking environment variable...");
    const envar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!envar) {
      logs.push("❌ FIREBASE_SERVICE_ACCOUNT_JSON not set");
      return NextResponse.json(
        { logs, error: "Env var not set" },
        { headers: getCorsHeaders() }
      );
    }

    logs.push(`✅ Env var found (${envar.length} chars)`);

    logs.push("2. Parsing JSON...");
    let parsed;
    try {
      parsed = JSON.parse(envar);
      logs.push("✅ JSON.parse succeeded");
    } catch (e) {
      logs.push(`❌ JSON.parse failed: ${e instanceof Error ? e.message : String(e)}`);
      return NextResponse.json(
        { logs, error: "JSON parse failed" },
        { headers: getCorsHeaders() }
      );
    }

    logs.push("3. Validating fields...");
    const requiredFields = ["private_key", "client_email", "project_id"];
    for (const field of requiredFields) {
      if (!parsed[field]) {
        logs.push(`❌ Missing field: ${field}`);
      } else {
        const sample = typeof parsed[field] === "string" ? parsed[field].substring(0, 50) : typeof parsed[field];
        logs.push(`✅ ${field}: ${sample}...`);
      }
    }

    logs.push("4. Checking private key format...");
    const key = parsed.private_key;
    if (typeof key === "string") {
      const hasBegin = key.includes("-----BEGIN PRIVATE KEY-----");
      const hasEnd = key.includes("-----END PRIVATE KEY-----");
      const newlineCount = (key.match(/\n/g) || []).length;
      
      logs.push(`   Private key length: ${key.length}`);
      logs.push(`   Has BEGIN marker: ${hasBegin ? "✅" : "❌"}`);
      logs.push(`   Has END marker: ${hasEnd ? "✅" : "❌"}`);
      logs.push(`   Newline count: ${newlineCount}`);

      if (key.includes("\\n")) {
        logs.push("⚠️  WARNING: Found literal \\n - need to replace with actual newlines!");
      }
    }

    logs.push("5. Testing Firebase initialization...");
    const { initializeFirebase, getFirebaseApp, getMessaging } = await import("@/lib/firebase");
    
    const app = initializeFirebase();
    logs.push(`   initializeFirebase: ${app ? "✅ Success" : "❌ Failed"}`);

    const firebaseApp = getFirebaseApp();
    logs.push(`   getFirebaseApp: ${firebaseApp ? "✅ Success" : "❌ Failed"}`);

    const messaging = getMessaging();
    logs.push(`   getMessaging: ${messaging ? "✅ Success" : "❌ Failed"}`);

    return NextResponse.json(
      {
        logs,
        status: "OK",
        firebase: {
          app: !!app,
          messaging: !!messaging,
        },
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    logs.push(`❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { logs, error: String(error) },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
