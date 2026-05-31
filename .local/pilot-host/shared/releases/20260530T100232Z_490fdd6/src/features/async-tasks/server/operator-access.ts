export type AsyncTaskOperatorScope = {
  role: "admin" | "developer";
  schoolIds: string[];
};

export function canOperatorAccessTask(input: {
  schoolId: string;
  visibilityScope: "actor_owned" | "school_operator" | "system_operator";
}, scope: AsyncTaskOperatorScope) {
  if (input.visibilityScope === "system_operator") {
    return scope.role === "developer";
  }

  if (input.visibilityScope === "school_operator") {
    return scope.schoolIds.includes(input.schoolId);
  }

  return false;
}
