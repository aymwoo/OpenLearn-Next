import { LessonAnnotationWidget } from "./lesson-annotation-widget";
import { NotificationStubWidget } from "./notification-stub-widget";
import { StepSuggestionWidget } from "./step-suggestion-widget";

type PluginProposal = {
  proposalType: string;
  payload: Record<string, unknown>;
  denied?: boolean;
} | null;

type PluginWidgetProps = {
  proposal: PluginProposal;
};

export function PluginWidget({ proposal }: PluginWidgetProps) {
  if (!proposal || proposal.denied) {
    return null;
  }

  switch (proposal.proposalType) {
    case "stepSuggestion":
      return <StepSuggestionWidget payload={proposal.payload} />;
    case "lessonAnnotation":
      return <LessonAnnotationWidget payload={proposal.payload} />;
    case "notificationStub":
      return <NotificationStubWidget payload={proposal.payload} />;
    default:
      return null;
  }
}
