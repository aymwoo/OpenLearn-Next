import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; roleIntent?: string }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-shell)] bg-surface-container-lowest p-8 shadow-ambient">
        <div className="mx-auto h-10 w-20 rounded-full bg-surface-container-low" />
        <div className="mt-8 grid gap-4">
          <div className="grid gap-2">
            <div className="h-5 w-12 rounded-full bg-surface-container-low" />
            <div className="h-11 rounded-full bg-surface-container-low" />
          </div>
          <div className="grid gap-2">
            <div className="h-5 w-12 rounded-full bg-surface-container-low" />
            <div className="h-11 rounded-full bg-surface-container-low" />
          </div>
          <div className="mt-4 h-12 rounded-full bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}

async function LoginContent({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;
  const roleIntent = params.roleIntent === "teacher" ? "teacher" : "student";
  const initialError =
    params.error === "CredentialsSignin" ? "邮箱或密码不正确。" : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-shell)] bg-surface-container-lowest p-8 shadow-ambient">
        <h1 className="text-center text-[2rem] font-semibold tracking-[-0.02em] text-on-surface">
          登录
        </h1>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          欢迎登录，您即将作为 {roleIntent === "teacher" ? "教师" : "学生"} 访问工作区。
        </p>
        <LoginForm initialError={initialError} roleIntent={roleIntent} />
      </div>
    </div>
  );
}
