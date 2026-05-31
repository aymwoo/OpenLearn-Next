import { exportScheduleImportBatchCsv } from "@/features/schedule/import";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { batchId } = await context.params;

  try {
    const result = await exportScheduleImportBatchCsv(batchId);

    return new Response(result.csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SCHEDULE_IMPORT_BATCH_NOT_FOUND") {
      return new Response("Not Found", { status: 404 });
    }

    throw error;
  }
}
