import { getClassroomIncidentOperatorDTO } from "@/lib/dal/classroom-incident-operator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ClassroomIncidentLandingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const detail = await getClassroomIncidentOperatorDTO({
    classroomSessionId: sessionId,
  });

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <Card className="bg-surface-container-low p-5 shadow-ambient sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <Badge variant="accent">查看课堂事件</Badge>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">
                  {detail.hero.className}
                </Badge>
              </div>
              <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-on-surface">
                {detail.hero.lessonTitle} · 课堂事件落点
              </h1>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Wave 2 先提供稳定 landing route，承接 classroom shell 与 relation cards 的 drill-down；完整 summary-first incident surface 留给后续 wave 扩展。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={detail.relatedCards.find((card) => card.kind === "command")?.href ?? "/settings/labs"}>
                  查看关联命令
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={detail.honesty.nextStepHref}>按推荐下一步继续</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-[#fff7ed] p-5 text-[#9a3412] shadow-ambient sm:p-6">
          <p className="text-sm uppercase tracking-[0.18em]">degraded honesty</p>
          <div className="mt-3 grid gap-3">
            <p className="text-sm leading-7">{detail.honesty.trustedFacts} {detail.honesty.untrustedFacts}</p>
            <p className="text-sm leading-7">影响范围：{detail.honesty.impactScope}</p>
            <p className="text-sm leading-7">推荐下一步：{detail.honesty.recommendedNextStep}</p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {detail.relatedCards.map((card) => (
            <Card key={`${card.kind}-${card.id}`} className="bg-surface-container-lowest p-4 shadow-ambient">
              <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">{card.kind}</p>
              <h2 className="mt-2 text-lg font-semibold text-on-surface">{card.label}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{card.summary}</p>
              <Button asChild variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">
                <Link href={card.href}>继续下钻</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
