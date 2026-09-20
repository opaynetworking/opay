export async function GET() {
  return Response.json({
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    email: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyHasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\n'),
    vapid: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });
}
