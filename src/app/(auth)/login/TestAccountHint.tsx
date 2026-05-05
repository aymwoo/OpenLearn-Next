"use client";

import { Button } from "@/components/ui/button";

export function TestAccountHint() {
  const accounts = [
    { label: "测试教师", email: "teacher@example.com", password: "password" },
    { label: "测试学生", email: "student@example.com", password: "password" },
  ];

  const fillAccount = (email: string, pass: string) => {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = pass;
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-2 border-t border-outline-variant pt-6">
      <span className="text-xs text-on-surface-variant">快速填充测试账号</span>
      <div className="flex gap-2">
        {accounts.map((acc) => (
          <button
            key={acc.label}
            type="button"
            onClick={() => fillAccount(acc.email, acc.password)}
            className="rounded-full bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            {acc.label}
          </button>
        ))}
      </div>
    </div>
  );
}
