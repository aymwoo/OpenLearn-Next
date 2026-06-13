import type { Metadata } from "next";
import { NotificationPageContent } from "@/components/notification/notification-page-content";

export const metadata: Metadata = {
  title: "通知中心",
};

/**
 * /notifications 通知中心页面（RSC）
 *
 * Layout: 中心 content, max-width 680px
 * Header: "通知中心" heading + "全部标为已读" button
 * List: cursor-based 分页（NotificationList 客户端组件）
 */
export default function NotificationsPage() {
  return <NotificationPageContent />;
}
