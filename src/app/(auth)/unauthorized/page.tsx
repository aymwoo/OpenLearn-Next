import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-[var(--radius-shell)] bg-surface-container-low p-8 text-center shadow-ambient">
        <h1 className="text-[2rem] font-semibold tracking-[-0.02em] text-on-surface mb-4">
          访问受限
        </h1>
        <p className="text-on-surface-variant mb-8 text-lg">
          暂无权限访问此工作区，请切换角色或返回。
        </p>
        <Button asChild className="min-h-12 w-full rounded-full bg-surface-container-highest">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
