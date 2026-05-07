"use client";

type RoleIntent = "teacher" | "student";

type TestAccountHintProps = {
  roleIntent?: RoleIntent;
  emailInputId?: string;
  passwordInputId?: string;
};

const accountsByRole: Record<RoleIntent, { label: string; email: string; password: string }> = {
  teacher: { label: "测试教师", email: "teacher01@openlearn.local", password: "password" },
  student: { label: "测试学生", email: "student01@openlearn.local", password: "password" },
};

export function TestAccountHint({
  roleIntent = "teacher",
  emailInputId = "email",
  passwordInputId = "password",
}: TestAccountHintProps) {
  const account = accountsByRole[roleIntent];

  const fillAccount = (email: string, pass: string) => {
    const emailInput = document.getElementById(emailInputId) as HTMLInputElement;
    const passwordInput = document.getElementById(passwordInputId) as HTMLInputElement;
    
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = pass;
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-surface-container-low px-4 py-4">
      <span className="text-xs text-on-surface-variant">快速填充当前入口测试账号</span>
      <button
        type="button"
        onClick={() => fillAccount(account.email, account.password)}
        className="rounded-full bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        {account.label}
      </button>
    </div>
  );
}
