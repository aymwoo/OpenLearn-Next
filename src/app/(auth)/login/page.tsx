import { auth, signIn } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function LoginPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams?.callbackUrl as string | undefined;
  const roleIntent = searchParams?.roleIntent as string | undefined;
  const error = searchParams?.error as string | undefined;

  const session = await auth();
  if (session) {
    redirect(callbackUrl || "/");
  }

  const roleText =
    roleIntent === "teacher"
      ? "教师"
      : roleIntent === "student"
      ? "学生"
      : "用户";

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient">
        <h1 className="text-[2rem] font-semibold tracking-[-0.02em] text-on-surface mb-2">
          {roleText}登录
        </h1>
        <p className="text-on-surface-variant mb-6">请输入您的邮箱和密码</p>
        
        {error && (
          <div className="mb-4 text-sm text-red-500">
            登录失败，请检查邮箱或密码。
          </div>
        )}

        <form
          action={async (formData) => {
            "use server";
            await signIn("credentials", formData);
          }}
          className="flex flex-col gap-4"
        >
          {callbackUrl && (
            <input type="hidden" name="redirectTo" value={callbackUrl} />
          )}
          
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">邮箱</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="rounded-full border border-surface-container-high bg-surface-container-lowest px-4 py-2 text-sm focus:outline-primary"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">密码</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-full border border-surface-container-high bg-surface-container-lowest px-4 py-2 text-sm focus:outline-primary"
            />
          </div>

          <Button type="submit" className="mt-4 min-h-12 w-full rounded-full bg-linear-135 from-primary to-primary-container text-on-primary">
            登录
          </Button>
        </form>
      </div>
    </main>
  );
}
