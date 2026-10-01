import { connectDB } from "@/lib/db/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const connection = await connectDB();
    const db = connection.connection.db;

    if (!db) {
      throw new Error("Database connection is unavailable.");
    }

    await db.command({ ping: 1 });

    return Response.json({
      success: true,
      message: "MongoDB connection successful",
    });
  } catch {
    return Response.json(
      { success: false, message: "MongoDB connection failed" },
      { status: 503 },
    );
  }
}
