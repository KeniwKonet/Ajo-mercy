import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Says out loud that the businesses on screen are demo data.
 *
 * The seeded businesses are real rows moving through the real workflow, which
 * is what makes them convincing, and exactly why the site has to say so. On a
 * platform whose whole claim is that a person verified these businesses, an
 * unlabelled fake is the one thing that would undermine it.
 *
 * Driven by the data, not a flag: it counts applications still carrying the
 * seed marker, so it appears while demo content is live and disappears by
 * itself once `db:seed --clean` removes it. Nobody has to remember to take it
 * down before launch, which is precisely the kind of thing that gets forgotten.
 */
export async function DemoBanner() {
  try {
    const admin = createAdminSupabase();
    const { count } = await admin
      .from("alajo_applications")
      .select("id", { count: "exact", head: true })
      .like("decision_reason", "[DEMO SEED]%")
      .eq("status", "approved");

    if (!count) return null;
  } catch {
    // A banner is never worth taking a page down for.
    return null;
  }

  return (
    <div className="border-b border-ochre/40 bg-ochre-wash">
      <div className="mx-auto flex w-full max-w-[84rem] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 sm:px-8">
        <span className="inline-flex shrink-0 items-center rounded-full bg-ochre px-2.5 py-0.5 text-2xs font-bold uppercase tracking-[0.06em] text-ink">
          Demo
        </span>
        <p className="text-xs leading-relaxed text-[#7a5a09]">
          The businesses shown here are sample data used while Ajo Mercy is being built. They are
          not real businesses, and nobody has been verified or supported.
        </p>
      </div>
    </div>
  );
}
