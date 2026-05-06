import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<StudentLayoutFallback />}>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </Suspense>
  );
}

async function StudentLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isStudent = memberships.some((m) => m.role === "student" && m.status === "active");

  if (!isStudent) {
    redirect("/unauthorized");
  }

  return (
    <div className="student-layout">
      {children}
    </div>
  );
}

function StudentLayoutFallback() {
  return <div className="student-layout" />;
}
