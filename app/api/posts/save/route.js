import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You need to be signed in to save posts." },
      { status: 401 }
    );
  }

  const { postId } = await request.json();
  if (!postId) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }

  const db = getAdminDb();
  const postRef = db.collection("posts").doc(postId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }
      const savedBy = snap.data().savedBy || [];
      const alreadySaved = savedBy.includes(user.uid);

      tx.update(postRef, {
        savedBy: alreadySaved
          ? FieldValue.arrayRemove(user.uid)
          : FieldValue.arrayUnion(user.uid),
      });

      return { saved: !alreadySaved };
    });

    return NextResponse.json({ ok: true, saved: result.saved });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Couldn't update save right now." },
      { status: 500 }
    );
  }
}
