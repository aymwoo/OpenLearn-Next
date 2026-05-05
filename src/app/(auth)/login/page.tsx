import { signIn } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { TestAccountHint } from "./TestAccountHint";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ roleIntent?: string }>;
}) {
  const params = await searchParams;
  const roleIntent = params.roleIntent;

  const handleSignIn = async (formData: FormData) => {
    "use server";
    await signIn("credentials", formData);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-shell)] bg-surface-container-lowest p-8 shadow-ambient">
        <h1 className="text-center text-[2rem] font-semibold tracking-[-0.02em] text-on-surface">
          登录
        </h1>
        {roleIntent && (
          <p className="mt-2 text-center text-sm text-on-surface-variant">
            欢迎登录，您即将作为 {roleIntent === "teacher" ? "教师" : "学生"} 访问工作区。
          </p>
        )}
        <form action={handleSignIn} className="mt-8 grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-on-surface"
            >
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="rounded-full bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-on-surface"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-full bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            className="mt-4 min-h-12 w-full rounded-full bg-linear-135 from-primary to-primary-container px-6 text-base font-semibold text-on-primary shadow-ambient"
          >
            登录
          </Button>
        </form>
        <TestAccountHint />
      </div>
    </div>
  );
}
