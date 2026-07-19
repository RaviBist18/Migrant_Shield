import { Severity } from "@/types";
import { SEVERITY_CONFIG, getSeverityLabel } from "@/lib/i18n/severity";

export default function SeverityBadge({
  severity,
  lang = "en",
}: {
  severity: Severity;
  lang?: string;
}) {
  const c = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-block px-3 py-1 rounded-sm text-xs font-black tracking-widest border ${c.bg} ${c.text} ${c.border}`}
    >
      {getSeverityLabel(severity, lang)}
    </span>
  );
}
