import { redirect } from "next/navigation";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

export default async function StudentLayout({
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
