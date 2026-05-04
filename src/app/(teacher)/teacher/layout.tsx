import { redirect } from "next/navigation";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isTeacher = memberships.some((m) => m.role === "teacher" && m.status === "active");

  if (!isTeacher) {
    redirect("/unauthorized");
  }

  return (
    <div className="teacher-layout">
      {children}
    </div>
  );
}
