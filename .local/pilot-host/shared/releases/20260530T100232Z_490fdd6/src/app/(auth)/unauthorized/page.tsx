import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-shell)] bg-surface-container-lowest p-8 text-center shadow-ambient">
        <h1 className="text-[2rem] font-semibold tracking-[-0.02em] text-on-surface">
          访问受限
        </h1>
        <p className="mt-4 text-base leading-7 text-on-surface-variant">
          暂无权限访问此工作区，请切换角色或返回。
        </p>
        <div className="mt-8 grid gap-3">
          <Button
            asChild
            className="min-h-12 w-full rounded-full bg-linear-135 from-primary to-primary-container px-6 text-base font-semibold text-on-primary shadow-ambient"
          >
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
