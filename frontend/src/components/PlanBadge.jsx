import { useTranslation } from "react-i18next";

const PLAN_STYLES = {
  free: { bg: "#f4f7fc", border: "#d9e2f2", color: "#14213d" },
  pro: { bg: "#fff7ea", border: "#f1e2be", color: "#14213d" },
  enterprise: { bg: "#14213d", border: "#14213d", color: "#fff" },
};

export function planLabel(plan, t) {
  const key = plan === "pro" || plan === "enterprise" ? plan : "free";
  return t(`plans.${key}`);
}

export default function PlanBadge({ plan = "free", compact = false }) {
  const { t } = useTranslation("common");
  const key = plan === "pro" || plan === "enterprise" ? plan : "free";
  const style = PLAN_STYLES[key];

  return (
    <span
      className={`plan-badge ${compact ? "plan-badge--compact" : ""}`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
      title={t("plans.current")}
    >
      <i className="fa-solid fa-layer-group" aria-hidden />
      {planLabel(key, t)}
    </span>
  );
}
