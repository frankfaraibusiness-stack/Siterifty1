import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

// /profile -> your own profile at /u/<username>
export default async function MyProfileRedirect() {
  const user = await getCurrentUser();
  if (!user?.username) redirect("/");
  redirect(`/u/${user.username}`);
}
