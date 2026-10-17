import { INSTAGRAM_STATUS_LABELS, type InstagramPostStatus } from "@/modules/instagram/rules";

const CLASSES: Record<InstagramPostStatus, string> = {
  DRAFT: "badge",
  SCHEDULED: "badge badge-solid",
  PUBLISHING: "badge badge-solid",
  PUBLISHED: "badge badge-strong",
  FAILED: "badge border-danger text-danger",
  CANCELED: "badge text-gray-600",
};

export function StatusBadge({ status }: { status: InstagramPostStatus }) {
  return <span className={CLASSES[status]}>{INSTAGRAM_STATUS_LABELS[status]}</span>;
}
