import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}

async function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isAdmin = memberships.some((m) => m.role === "admin" && m.status === "active");

  if (!isAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}

function AdminLayoutFallback() {
  return <div className="admin-layout" />;
}
