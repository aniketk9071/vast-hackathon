const categoryColors: Record<string, string> = {
  LANGUAGE: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700",
  FRAMEWORK: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700",
  PLATFORM: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700",
  TOOL: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700",
  DOMAIN: "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-700",
};

const proficiencyDot: Record<string, string> = {
  NOVICE: "bg-yellow-400",
  INTERMEDIATE: "bg-blue-400",
  EXPERT: "bg-green-500",
};

interface Props {
  name: string;
  category: string;
  proficiency: string;
  yearsExp?: number | null;
  size?: "sm" | "md";
}

export default function SkillBadge({ name, category, proficiency, yearsExp, size = "md" }: Props) {
  const color = categoryColors[category] ?? "bg-gray-100 text-gray-800 border-gray-200";
  const dot = proficiencyDot[proficiency] ?? "bg-gray-400";
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${color} ${padding}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} flex-shrink-0`} title={proficiency} />
      {name}
      {yearsExp != null && (
        <span className="opacity-60 text-xs">{yearsExp}yr</span>
      )}
    </span>
  );
}
