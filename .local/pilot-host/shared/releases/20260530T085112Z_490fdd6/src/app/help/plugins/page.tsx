import { HelpGuideDetailSurface } from "@/components/surfaces/help-guide-detail-surface";
import { helpGuidePages } from "@/lib/help/help-center-content";

export default function HelpPluginsPage() {
  return <HelpGuideDetailSurface guide={helpGuidePages["/help/plugins"]} />;
}
