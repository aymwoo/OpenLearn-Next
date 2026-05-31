import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

import { PHASE60_THRESHOLDS } from "./phase60-thresholds.js";

const FIXTURES = JSON.parse(open("./phase60-fixtures.generated.json"));
const BASE_URL = __ENV.PHASE60_BASE_URL || "http://127.0.0.1:3000";
const CHECK_RATE_MIN = 1 - PHASE60_THRESHOLDS.partialFailureRatioMax;

function buildScenarios() {
  const scenarios = {};

  for (const fixture of FIXTURES.classrooms) {
    scenarios[fixture.classroom] = {
      executor: "per-vu-iterations",
      vus: PHASE60_THRESHOLDS.studentsPerClassroom,
      iterations: 1,
      maxDuration: "2m",
      exec: "runCapacityScenario",
      tags: {
        classroom: fixture.classroom,
      },
    };
  }

  return scenarios;
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    checks: [`rate>${CHECK_RATE_MIN}`],
    http_req_failed: [`rate<${PHASE60_THRESHOLDS.partialFailureRatioMax}`],
  },
};

function resolveFixtureForScenario() {
  const scenarioName = __ENV.K6_SCENARIO_NAME || (__ENV.SCENARIO_NAME || null);
  const tagName = scenarioName || (__ITER >= 0 ? exec.scenario.name : null);
  return FIXTURES.classrooms.find((fixture) => fixture.classroom === tagName) || FIXTURES.classrooms[0];
}

export function runCapacityScenario() {
  const fixture = resolveFixtureForScenario();
  const actor = fixture.studentActors[(__VU - 1) % fixture.studentActors.length];
  const response = http.get(
    `${BASE_URL}/api/classroom/${fixture.classroomSessionId}/snapshot`,
    {
      headers: {
        Cookie: `${FIXTURES.cookieName}=${actor.sessionCookie}`,
      },
      tags: {
        classroom: fixture.classroom,
      },
    },
  );

  check(response, {
    "snapshot returns 200": (res) => res.status === 200,
    "snapshot stays cache-busted": (res) => String(res.headers["Cache-Control"] || "").includes("no-store"),
  });

  sleep(0.05);
}

export default runCapacityScenario;

export function handleSummary(data) {
  const checksRate = data.metrics.checks?.values?.rate ?? 0;
  const httpReqFailedRate = data.metrics.http_req_failed?.values?.rate ?? 0;
  const scenarioResults = FIXTURES.classrooms.map((fixture) => ({
    classroom: fixture.classroom,
    actors: PHASE60_THRESHOLDS.studentsPerClassroom,
    iterations: PHASE60_THRESHOLDS.studentsPerClassroom,
    checksRate,
    httpReqFailedRate,
  }));
  const status = checksRate >= CHECK_RATE_MIN && httpReqFailedRate < PHASE60_THRESHOLDS.partialFailureRatioMax
    ? "passed"
    : "close-blocker";

  return {
    "ops/releases/evidence/phase60/capacity-result.json": JSON.stringify({
      checkedAt: new Date().toISOString(),
      scenarioResults,
      thresholds: PHASE60_THRESHOLDS,
      status,
      blockingFailure: status === "passed"
        ? null
        : "Phase 60 capacity gate breached the shared checks/http_req_failed thresholds.",
      nextStep: status === "passed"
        ? "Continue to the automated drill stage."
        : "Stop closeout and inspect the 40/5 classroom-affined capacity posture.",
    }, null, 2),
  };
}
