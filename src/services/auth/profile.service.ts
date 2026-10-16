import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppError } from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validation/profile";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

const profileFields = "_id name email phone bio createdAt";

function activeAccount(userId: string) {
  if (!/^[a-f\d]{24}$/i.test(userId)) {
    throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
  }
  return { _id: new Types.ObjectId(userId), status: "Active" as const };
}

export async function getProfile(userId: string) {
  const filter = activeAccount(userId);
  await connectDB();
  const user = await User.findOne(filter).select(profileFields).lean();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateProfile(userId: string, input: unknown) {
  const filter = activeAccount(userId);
  const data = updateProfileSchema.parse(input);
  const connection = await connectDB();
  await AuditLog.init();
  await connection.connection.transaction(async (session) => {
    const user = await User.findOneAndUpdate(filter, { $set: data }, {
      session, returnDocument: "after", runValidators: true,
    }).select("_id");
    if (!user) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    await AuditLog.create([{
      scope: "Account", userId: user._id, entityId: user._id,
      action: "PROFILE_UPDATED", entityType: "User",
      details: { fields: Object.keys(data) },
    }], { session });
  }, { readPreference: "primary" });
  return { message: "Profile saved successfully." };
}
