import type { PluginActionResult } from "@/lib/dto/resource-ai";

import { BuiltInTeachingStepSuggestionWidget } from "./built-in-teaching-step-suggestion-widget";
import { BuiltInTeachingStepTemplateWidget } from "./built-in-teaching-step-template-widget";
import { LessonAnnotationWidget } from "./lesson-annotation-widget";
import { NotificationStubWidget } from "./notification-stub-widget";
import { StepSuggestionWidget } from "./step-suggestion-widget";

type PluginProposal = PluginActionResult | null;

type PluginWidgetProps = {
  proposal: PluginProposal;
};

export function PluginWidget({ proposal }: PluginWidgetProps) {
  if (!proposal || ("denied" in proposal && proposal.denied)) {
    return null;
  }

  switch (proposal.proposalType) {
    case "stepSuggestion":
      return <StepSuggestionWidget payload={proposal.payload} />;
    case "lessonAnnotation":
      return <LessonAnnotationWidget payload={proposal.payload} />;
    case "notificationStub":
      return <NotificationStubWidget payload={proposal.payload} />;
    case "builtInTeachingStepSuggestion":
      return <BuiltInTeachingStepSuggestionWidget payload={proposal.payload} />;
    case "builtInTeachingStepTemplate":
      return <BuiltInTeachingStepTemplateWidget payload={proposal.payload} />;
    default:
      return null;
  }
}
