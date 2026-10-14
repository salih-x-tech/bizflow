import { RecoveryForm } from "@/components/auth/link-flows";
export const metadata = { title: "Forgot password" };
export default function Page() { return <div className="space-y-6"><h1 className="text-2xl font-semibold">Forgot password</h1><p className="text-muted">Request a secure, single-use reset link.</p><RecoveryForm /></div>; }
