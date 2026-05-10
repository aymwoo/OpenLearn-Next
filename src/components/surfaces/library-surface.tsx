import { BookMarked, Search, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { courseCards } from "@/lib/demo-data";
import { ResourceCardDTO } from "@/lib/dto/resource-ai";
import { cn } from "@/lib/utils";

type LibrarySurfaceProps = {
  mode: "courses" | "resources";
  resources?: ResourceCardDTO[];
};

export function LibrarySurface({ mode, resources = [] }: LibrarySurfaceProps) {
  const isCourses = mode === "courses";
  const title = isCourses ? "课程中心" : "资源中心";
  const action = isCourses ? "创建课程" : "登记链接资源";
  const eyebrow = isCourses ? "课程中心" : "教学资源中心";

  return (
    <div className={teacherSurfaceRhythm.stack}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge
              variant="accent"
              className="mb-4 bg-surface-container-lowest"
            >
              {eyebrow}
            </Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
              {title}
            </h1>
            <p className="mt-4 leading-8 text-on-surface-variant">
              {isCourses
                ? "围绕学段、主题和教学节奏组织课程结构，持续补齐课时外壳与教学进度。"
                : "集中查看变量小抄、Scratch 素材、课堂任务单与外部链接资源，保持检索与整理体验一致。"}
            </p>
          </div>
          <Button className="gap-2 text-base">
            {isCourses ? (
              <BookMarked className="size-5" aria-hidden />
            ) : (
              <LinkIcon className="size-5" aria-hidden />
            )}
            {action}
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            [
              "内容分层",
              isCourses ? "课程 / 单元 / 课时" : "资源 / 分类 / 适用场景",
            ],
            ["检索方式", "关键词 + 学段 + 主题"],
            ["视觉节奏", "高密度卡片 + 大留白标题"],
          ].map(([label, value]) => (
            <div
              key={label}
              className={cn(teacherSurfaceRhythm.cardInset, "p-4")}
            >
              <p className="text-sm text-on-surface-variant">{label}</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={teacherSurfaceRhythm.section}>
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm text-on-surface-variant">卡片式内容库</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {isCourses ? "七年级编程基础" : "课堂资源"} · 可继续整理
            </h2>
          </div>
          <div className="flex min-h-12 items-center gap-3 rounded-full bg-surface-container-lowest px-5 text-on-surface-variant shadow-ambient">
            <Search className="size-5 text-primary" aria-hidden />
            <span className="text-sm">按主题、年级或用途筛选</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isCourses
            ? courseCards.map((item) => (
                <Card
                  key={item.title}
                  className="min-h-56 bg-surface-container-lowest p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="default">{item.subject}</Badge>
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant">
                      {item.lessons}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-4 leading-7 text-on-surface-variant">{`${item.subject} · ${item.status}`}</p>
                  <Button
                    variant="tertiary"
                    className="mt-5 min-h-10 justify-start px-0 text-sm"
                  >
                    查看课程结构
                  </Button>
                </Card>
              ))
            : resources.map((item) => (
                <Card
                  key={item.id}
                  className="min-h-56 bg-surface-container-lowest p-5"
                >
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="default">{item.classification}</Badge>
                    <Badge variant={item.ragEligible ? "success" : "default"}>
                      {item.ragEligible ? "可进入 RAG" : "RAG 未启用"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    可见性: {item.visibility} | 所有者: {item.ownerId}
                  </p>
                  {item.url && (
                    <p className="mt-2 truncate text-sm text-primary">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.url}
                      </a>
                    </p>
                  )}
                  <div
                    className={cn(
                      teacherSurfaceRhythm.card,
                      "mt-4 bg-surface-container-low p-4 text-sm text-on-surface-variant",
                    )}
                  >
                    <p>年级/学科: (暂无数据)</p>
                    <p>教材/版本: (暂无数据)</p>
                    <p>册/章/节: (暂无数据)</p>
                    <p>知识标签: (暂无数据)</p>
                  </div>
                  <Button
                    variant="tertiary"
                    className="mt-5 min-h-10 justify-start px-0 text-sm"
                  >
                    查看资源详情
                  </Button>
                </Card>
              ))}
        </div>
      </section>
    </div>
  );
}
