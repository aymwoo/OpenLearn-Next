import { getClassroomSnapshotDTO } from "@/lib/dal/classroom";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const snapshot = await getClassroomSnapshotDTO({ sessionId });
    return Response.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      let status = 400;
      
      if (message === "TEACHER_AUTH_REQUIRED") status = 401;
      if (message === "CLASSROOM_PARTICIPANT_REQUIRED") status = 403;
      if (message === "CLASSROOM_ENDED") status = 404;

      return Response.json(
        { error: message, message },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    
    return Response.json(
      { error: "INTERNAL_SERVER_ERROR", message: "服务器内部错误" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
