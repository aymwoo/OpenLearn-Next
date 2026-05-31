import { HelpGuideDetailSurface } from "@/components/surfaces/help-guide-detail-surface";
import { helpGuidePages } from "@/lib/help/help-center-content";

export default function HelpActionsInterfacesPage() {
  return <HelpGuideDetailSurface guide={helpGuidePages["/help/actions-interfaces"]} />;
}
