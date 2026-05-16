import Link from "next/link";
import SkillBadge from "./SkillBadge";

interface Skill {
  name: string;
  category: string;
  proficiency: string;
  yearsExp?: number | null;
}

interface Props {
  id: string;
  name: string;
  department?: string | null;
  location?: string | null;
  yearsTotal?: number | null;
  bio?: string | null;
  skills: Skill[];
  matchScore?: number;
  matchReason?: string;
  strengths?: string[];
  linkPrefix?: string;
}

export default function ProfileCard({
  id,
  name,
  department,
  location,
  yearsTotal,
  bio,
  skills,
  matchScore,
  matchReason,
  strengths,
  linkPrefix = "/hr/employees",
}: Props) {
  const topSkills = skills.slice(0, 6);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <Link href={`${linkPrefix}/${id}`} className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {name}
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {department && <span>{department}</span>}
              {department && location && <span>·</span>}
              {location && <span>{location}</span>}
              {yearsTotal && (
                <>
                  <span>·</span>
                  <span>{yearsTotal}yr exp</span>
                </>
              )}
            </div>
          </div>
        </div>

        {matchScore != null && (
          <div className="flex-shrink-0 text-right">
            <div
              className={`text-2xl font-bold ${
                matchScore >= 80 ? "text-green-600 dark:text-green-400" : matchScore >= 60 ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {matchScore}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">/ 100</div>
          </div>
        )}
      </div>

      {matchReason && (
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-800">
          {matchReason}
        </p>
      )}

      {!matchReason && bio && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{bio}</p>
      )}

      {strengths && strengths.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {strengths.map((s) => (
            <span key={s} className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-full px-2 py-0.5">
              ✓ {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {topSkills.map((skill) => (
          <SkillBadge
            key={skill.name}
            name={skill.name}
            category={skill.category}
            proficiency={skill.proficiency}
            size="sm"
          />
        ))}
        {skills.length > 6 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center">+{skills.length - 6} more</span>
        )}
      </div>
    </div>
  );
}
