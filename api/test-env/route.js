import { initializeApp, cert, getApps } from "firebase-admin/app";

export async function GET() {
  try {
    const key = process.env.FIREBASE_PRIVATE_KEY || "";

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: key.replace(/\\n/g, "\n"), // Converts literal \n to real newlines
        }),
      });
    }

    return Response.json({
      success: true,
      message: "✅ Firebase Admin initialized successfully!",
    });
  } catch (err) {
    // This will show you the real error in the response
    return Response.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        hint: "Check that FIREBASE_PRIVATE_KEY is on a single line with literal \\n sequences and is not wrapped in quotes.",
      },
      { status: 500 }
    );
  }
}