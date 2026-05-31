export function buildClassImportTemplateCsv() {
  return ["className", "高一（1）班", "高一（2）班"].join("\n");
}

export function buildRosterImportTemplateCsv() {
  return [
    "className,studentName,studentNumber,gender",
    "高一（1）班,张三,S2026001,男",
    "高一（1）班,李四,S2026002,女",
  ].join("\n");
}
