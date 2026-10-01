import { initializeDevelopmentDatabase } from "@/lib/db/initialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const collections = await initializeDevelopmentDatabase();

    return Response.json({
      success: true,
      collectionCount: collections.length,
      collections,
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "Database initialization failed.",
      },
      { status: 500 },
    );
  }
}