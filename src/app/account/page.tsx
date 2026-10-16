import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/require-page-user";
import { getProfile } from "@/services/auth/profile.service";
import { LogoutButton } from "@/components/auth/logout-button";
import { MutationForm } from "@/components/workspace/mutation-form";

export const metadata: Metadata = { title: "Your profile" };

export default async function AccountPage() {
  const user = await requirePageUser();
  const profile = await getProfile(user.id);
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-2xl font-semibold tracking-tight">BizFlow</Link>
        <div className="flex flex-wrap gap-3"><Link href="/" className="secondary-button">Your businesses</Link><LogoutButton /></div>
      </header>
      <div className="mb-8"><p className="text-sm text-indigo-300">Account</p><h1 className="mt-2 text-3xl font-semibold">Your profile</h1><p className="text-muted mt-3">Your personal details across all your businesses.</p></div>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-label="Account details" className="glass-panel min-w-0 space-y-5 p-6">
          <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200">{initials}</div>
          <h2 className="break-words text-xl font-semibold">{profile.name}</h2>
          <dl className="space-y-4 text-sm">
            <div><dt className="text-muted">Email address</dt><dd className="mt-1 break-words">{profile.email}</dd></div>
            <div><dt className="text-muted">Contact number</dt><dd className="mt-1 break-words">{profile.phone || "Not added"}</dd></div>
            <div><dt className="text-muted">Member since</dt><dd className="mt-1">{profile.createdAt.slice(0, 10)} (UTC)</dd></div>
          </dl>
        </section>
        <section aria-labelledby="edit-profile-heading" className="glass-panel min-w-0 space-y-6 p-6 sm:p-8">
          <h2 id="edit-profile-heading" className="text-xl font-semibold">Edit profile</h2>
          <p className="text-muted text-sm">Your email address is used for sign-in. Contact details are optional.</p>
          <MutationForm url="/api/account/profile" method="PATCH" label="Save profile" fields={[
            { name: "name", label: "Full name", required: true, maxLength: 100, value: profile.name },
            { name: "phone", label: "Contact number (optional)", type: "tel", maxLength: 40, value: profile.phone },
            { name: "bio", label: "About you (optional)", type: "textarea", maxLength: 500, value: profile.bio },
          ]} />
        </section>
      </div>
    </main>
  );
}
