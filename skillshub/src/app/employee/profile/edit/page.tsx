"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", phone: "", currentCompany: "", noticePeriod: "",
    location: "", department: "", education: "", linkedIn: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      if (d.profile) {
        setForm({
          name: "",
          phone: d.profile.phone ?? "",
          currentCompany: d.profile.currentCompany ?? "",
          noticePeriod: d.profile.noticePeriod ?? "",
          location: d.profile.location ?? "",
          department: d.profile.department ?? "",
          education: d.profile.education ?? "",
          linkedIn: d.profile.linkedIn ?? "",
        });
      }
      setLoading(false);
    });
  }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => router.push("/employee"), 1200);
    } else {
      setMessage({ type: "error", text: data.error ?? "Failed to update profile" });
    }
  }

  const fields = [
    { label: "Full Name", key: "name", type: "text", placeholder: "Leave blank to keep current name" },
    { label: "Phone Number", key: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
    { label: "Current Company", key: "currentCompany", type: "text", placeholder: "TechCorp Inc." },
    { label: "Notice Period", key: "noticePeriod", type: "text", placeholder: "e.g. 30 days, Immediate" },
    { label: "Location", key: "location", type: "text", placeholder: "San Francisco, CA" },
    { label: "Department", key: "department", type: "text", placeholder: "Engineering" },
    { label: "LinkedIn URL", key: "linkedIn", type: "url", placeholder: "https://linkedin.com/in/yourname" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Update your personal and professional details</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input type={type} value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Education</label>
              <textarea value={form.education} onChange={(e) => set("education", e.target.value)} rows={3}
                placeholder="B.S. Computer Science, University of Texas at Austin (2017)"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
            </div>

            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => router.push("/employee")}
                className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
