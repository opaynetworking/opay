import { initializeApp, cert, getApps } from "firebase-admin/app";

export async function GET() {
  try {
    const key = process.env.FIREBASE_PRIVATE_KEY || "";

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: key.replace(/\\n/g, "\n"),
        }),
      });
    }

    return Response.json({
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      email: !!process.env.FIREBASE_CLIENT_EMAIL,
      keyStartsWithHeader: key.startsWith("-----BEGIN PRIVATE KEY-----"),
      keyEndsWithFooter: key.trim().endsWith("-----END PRIVATE KEY-----"),
      keyHasLiteralBackslashN: key.includes("\\n"),
      adminInit: "SUCCESS ✅ — Firebase Admin is configured correctly",
    });
  } catch (err) {
    return Response.json(
      {
        adminInit: "FAILED ❌",
        error: err.message,
        code: err.code,
      },
      { status: 500 }
    );
  }
}
