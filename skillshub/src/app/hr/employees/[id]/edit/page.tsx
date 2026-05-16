"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"] as const;
const PROFICIENCIES = ["NOVICE", "INTERMEDIATE", "EXPERT"] as const;
type Category = typeof CATEGORIES[number];
type Proficiency = typeof PROFICIENCIES[number];

const CAT_COLORS: Record<Category, string> = {
  LANGUAGE:  "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  FRAMEWORK: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  PLATFORM:  "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  TOOL:      "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  DOMAIN:    "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
};

const PROF_DOT: Record<Proficiency, string> = {
  EXPERT:       "bg-green-500",
  INTERMEDIATE: "bg-blue-500",
  NOVICE:       "bg-amber-400",
};

interface Skill {
  id?: string;
  name: string;
  category: Category;
  proficiency: Proficiency;
  yearsExp: number | null;
}

interface FormState {
  name: string;
  email: string;
  bio: string;
  department: string;
  location: string;
  yearsTotal: string;
  linkedIn: string;
  phone: string;
  currentCompany: string;
  noticePeriod: string;
  education: string;
  github: string;
  githubRepo: string;
}

const EMPTY_FORM: FormState = {
  name: "", email: "", bio: "", department: "", location: "",
  yearsTotal: "", linkedIn: "", phone: "", currentCompany: "",
  noticePeriod: "", education: "", github: "", githubRepo: "",
};

const EMPTY_SKILL = { name: "", category: "LANGUAGE" as Category, proficiency: "INTERMEDIATE" as Proficiency, yearsExp: "" };

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState(EMPTY_SKILL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/employees/${params.id}`)
      .then((r) => r.json())
      .then(({ employee }) => {
        setForm({
          name:           employee.user.name          ?? "",
          email:          employee.user.email         ?? "",
          bio:            employee.bio                ?? "",
          department:     employee.department         ?? "",
          location:       employee.location           ?? "",
          yearsTotal:     employee.yearsTotal != null ? String(employee.yearsTotal) : "",
          linkedIn:       employee.linkedIn           ?? "",
          phone:          employee.phone              ?? "",
          currentCompany: employee.currentCompany     ?? "",
          noticePeriod:   employee.noticePeriod       ?? "",
          education:      employee.education          ?? "",
          github:         employee.github             ?? "",
          githubRepo:     employee.githubRepo         ?? "",
        });
        setSkills(employee.skills ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load employee data."); setLoading(false); });
  }, [params.id]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function removeSkill(idx: number) {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSkill() {
    if (!newSkill.name.trim()) return;
    setSkills((prev) => [
      ...prev,
      {
        name: newSkill.name.trim(),
        category: newSkill.category,
        proficiency: newSkill.proficiency,
        yearsExp: newSkill.yearsExp !== "" ? parseFloat(newSkill.yearsExp) || null : null,
      },
    ]);
    setNewSkill(EMPTY_SKILL);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          yearsTotal: form.yearsTotal !== "" ? parseInt(form.yearsTotal) : null,
          skills: skills.map(({ id: _id, ...s }) => s),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/hr/employees/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">Loading employee data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href={`/hr/employees/${params.id}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-1">
            ← Back to profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Employee</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/employees/${params.id}`}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Account */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.name} onChange={(v) => set("name", v)} placeholder="Jane Smith" />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="jane@company.com" />
          </div>
        </section>

        {/* Profile */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("bio", e.target.value)}
                placeholder="Short summary about the employee..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Department"      value={form.department}     onChange={(v) => set("department", v)}     placeholder="Engineering" />
              <Field label="Location"        value={form.location}       onChange={(v) => set("location", v)}       placeholder="New York" />
              <Field label="Years Experience" type="number" value={form.yearsTotal} onChange={(v) => set("yearsTotal", v)} placeholder="5" />
              <Field label="Current Company" value={form.currentCompany} onChange={(v) => set("currentCompany", v)} placeholder="Acme Corp" />
              <Field label="Notice Period"   value={form.noticePeriod}   onChange={(v) => set("noticePeriod", v)}   placeholder="2 weeks" />
              <Field label="Phone"           value={form.phone}          onChange={(v) => set("phone", v)}          placeholder="+1 555-0100" />
            </div>
            <Field label="LinkedIn URL" value={form.linkedIn} onChange={(v) => set("linkedIn", v)} placeholder="https://linkedin.com/in/..." />
            <Field label="Education"    value={form.education} onChange={(v) => set("education", v)} placeholder="B.Sc. Computer Science, MIT" />
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="GitHub Username" value={form.github} onChange={(v) => set("github", v)} placeholder="torvalds" />
                <Field label="Primary Repository" value={form.githubRepo} onChange={(v) => set("githubRepo", v)} placeholder="owner/repo-name" />
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Skills</h2>
            <span className="text-xs text-gray-400">{skills.length} total</span>
          </div>

          {/* Existing skills list */}
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-5">
              {skills.map((s, i) => (
                <div key={i} className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium ${CAT_COLORS[s.category]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PROF_DOT[s.proficiency]}`} />
                  <span>{s.name}</span>
                  {s.yearsExp != null && <span className="opacity-60">· {s.yearsExp}yr</span>}
                  <button
                    onClick={() => removeSkill(i)}
                    className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity text-sm leading-none"
                    title="Remove skill"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">No skills yet. Add some below.</p>
          )}

          {/* Add skill form */}
          <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Add a skill</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <input
                value={newSkill.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkill((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addSkill()}
                placeholder="Skill name"
                className="col-span-2 sm:col-span-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newSkill.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSkill((p) => ({ ...p, category: e.target.value as Category }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={newSkill.proficiency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSkill((p) => ({ ...p, proficiency: e.target.value as Proficiency }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newSkill.yearsExp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSkill((p) => ({ ...p, yearsExp: e.target.value }))}
                  placeholder="Yrs"
                  min={0}
                  max={40}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addSkill}
                  disabled={!newSkill.name.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom save bar */}
      <div className="mt-6 flex items-center justify-between gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="ml-auto flex gap-2">
          <Link href={`/hr/employees/${params.id}`}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
