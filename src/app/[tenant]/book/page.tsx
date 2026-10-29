import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/${tenant}`);
}
