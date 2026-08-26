#!/usr/bin/env node
/**
 * Development seed. Creates a small set of demo accounts and applications so
 * the review queue, discovery and dashboards have something in them.
 *
 *   node --env-file=.env.local scripts/seed.mjs
 *   node --env-file=.env.local scripts/seed.mjs --force   (non-localhost)
 *   node --env-file=.env.local scripts/seed.mjs --clean   (remove seeded rows)
 *
 * Everything created here is marked so it can never be mistaken for real
 * content: accounts use the reserved `.test` domain, and every application
 * carries a DEMO note in its internal fields. Nothing seeded is auto-approved,
 * so approvals still go through the real review flow.
 */

import { createClient } from "@supabase/supabase-js";

const SEED_DOMAIN = "seed.ajomercy.test";
const SEED_MARKER = "[DEMO SEED] Created by scripts/seed.mjs. Not a real business.";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const force = process.argv.includes("--force");
const clean = process.argv.includes("--clean");

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const isLocal = siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1");
if (!isLocal && !force) {
  console.error(
    `NEXT_PUBLIC_SITE_URL is "${siteUrl}", which does not look like local development.\n` +
      "Seeding a live database would put demo businesses in front of real visitors.\n" +
      "Re-run with --force if you are certain.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "demo-password-9animals";

/** Realistic but obviously placeholder Nigerian businesses. */
const ALAJOS = [
  {
    email: `tola.adeyemi@${SEED_DOMAIN}`,
    fullName: "Tola Adeyemi",
    businessName: "Iya Tola Frozen Foods",
    category: "food_and_beverage",
    state: "Lagos",
    city: "Ikorodu",
    yearStarted: 2016,
    employees: 4,
    amount: 850000,
    description:
      "A frozen foods shop selling chicken, turkey and fish to households and small restaurants around Ikorodu.",
    story:
      "I started with one small freezer in front of my house in 2016, buying two cartons of chicken at a time from Mile 12 and selling to neighbours. People trusted me because I never sold anything that had thawed, even when it meant losing a whole carton.\n\nBy 2019 I had three freezers and a proper shop, and four people working with me. Two of them have been with me since the beginning. We supply about fifteen small restaurants now, and the buka women send their apprentices to me because they know what they are getting.\n\nThe business has carried my two children through secondary school. My eldest is in her first year at university.",
    challenge:
      "The main freezer packed up in March and the repairer says the compressor cannot be fixed again. I have been renting cold storage space three streets away, which costs me eighteen thousand naira a week and means I lose stock every time there is a long power cut on their side.",
    enable:
      "A replacement chest freezer and a small inverter setup would take that eighteen thousand a week back into stock. I could go back to buying full cartons at Mile 12 prices instead of buying small, which is where the margin is.",
  },
  {
    email: `chidi.okonkwo@${SEED_DOMAIN}`,
    fullName: "Chidi Okonkwo",
    businessName: "Nkwo Leatherworks",
    category: "fashion_and_textiles",
    state: "Abia",
    city: "Aba",
    yearStarted: 2011,
    employees: 7,
    amount: 2400000,
    description:
      "A leather workshop in Aba making shoes, belts and bags, supplying traders in Lagos, Onitsha and Kano.",
    story:
      "I learned this trade from my uncle in Ariaria market, and I have been on my own since 2011. We make shoes properly here, welted, not glued, and buyers who know the difference come back.\n\nSeven of us work in the shop. Four are apprentices I am training, which is how I learned, and two of my old apprentices now have their own workshops.\n\nWe were sending about two hundred pairs a month to a trader in Lagos before the naira moved and the price of imported leather doubled.",
    challenge:
      "Our two sewing machines are hand-operated and we cannot keep up with the orders we already have. I turned down a repeat order for three hundred pairs in January because I knew we could not deliver on time, and that buyer has not come back.",
    enable:
      "Two industrial post-bed machines would roughly double what we can finish in a week. It would also let me take on two more apprentices, because the bottleneck right now is machines, not hands.",
  },
  {
    email: `amina.yusuf@${SEED_DOMAIN}`,
    fullName: "Amina Yusuf",
    businessName: "Sahel Grains Cooperative",
    category: "agriculture",
    state: "Kano",
    city: "Dawakin Kudu",
    yearStarted: 2018,
    employees: 12,
    amount: 3200000,
    description:
      "A women's cooperative cleaning, grading and bagging rice and millet for sale in Kano markets.",
    story:
      "We are twenty-two women who farm small plots and used to sell our grain to middlemen at whatever price they offered on the day. In 2018 we started pooling what we harvested and cleaning it ourselves before selling.\n\nThe difference in price for properly cleaned and graded grain is not small. It is the difference between a season that pays school fees and one that does not.\n\nTwelve of us work in the cleaning shed through the season. The rest bring their harvest in and take a share.",
    challenge:
      "We clean and grade by hand, on mats, which means we can only process what twelve people can do in a day. During harvest we have to turn away grain from our own members because we cannot get through it, and they end up selling to the middlemen after all.",
    enable:
      "A destoner and a small grading machine would let us process about four times what we manage now. Every member would be able to bring in her whole harvest instead of a portion of it.",
  },
  {
    email: `emeka.balogun@${SEED_DOMAIN}`,
    fullName: "Emeka Balogun",
    businessName: "Brightpath Computer Training",
    category: "education",
    state: "Enugu",
    city: "Enugu",
    yearStarted: 2020,
    employees: 3,
    amount: 1500000,
    description:
      "A small training centre teaching computer basics, data entry and spreadsheets to secondary school leavers.",
    story:
      "I ran a business centre for years, typing and printing, and kept meeting young people who could not use a computer at all and were being turned down for jobs because of it. In 2020 I turned half the shop into a classroom.\n\nWe have taken about four hundred students through the basic course. Around a third of them have found work that needed the certificate, mostly data entry and shop administration.\n\nThe fee is eight thousand naira for six weeks, and we let people pay in instalments because most of them are not working yet.",
    challenge:
      "We have six computers and four of them are older than the business. Two failed last term and I had to run classes in shifts, which meant turning away a whole intake. The students who were turned away have not come back.",
    enable:
      "Six replacement machines would let us run two full classes a day instead of shifts. That is about sixty more students a term, and it is the difference between the centre paying for itself and not.",
  },
  {
    email: `funke.adeleke@${SEED_DOMAIN}`,
    fullName: "Funke Adeleke",
    businessName: "Ilaji Shea and Soap",
    category: "beauty_and_wellness",
    state: "Oyo",
    city: "Ibadan",
    yearStarted: 2019,
    employees: 5,
    amount: 620000,
    description:
      "Handmade black soap, shea butter and hair oils, sold at markets in Ibadan and online.",
    story:
      "My grandmother made black soap and sold it at Bodija. I started making it again in 2019 after I lost my job, using her method with the cocoa pod ash, and selling on Instagram.\n\nFive women work with me now, mostly on the shea, which is slow work. We supply two salons and a small pharmacy, and the rest goes out through Instagram and WhatsApp.\n\nOur orders roughly doubled last year, mostly from people who found us through other customers.",
    challenge:
      "We make everything in my back yard and when it rains we cannot work, because the ash and the shea both spoil if they get wet. We lost about three weeks of production in the last rainy season.",
    enable:
      "Roofing and concreting the work area at the back, and a proper mixing drum. It would mean we can work through the rains instead of stopping, and that alone would cover the cost inside a year.",
  },
];

const SUPPORTERS = [
  {
    email: `demo.supporter1@${SEED_DOMAIN}`,
    fullName: "Ngozi Eze",
    occupation: "Secondary school teacher",
    state: "Lagos",
    city: "Surulere",
    motivation:
      "My mother ran a small provisions shop and I know how close those businesses run to the edge. I would rather back one properly than spread a little everywhere.",
    interests: ["food_and_beverage", "education"],
  },
  {
    email: `demo.supporter2@${SEED_DOMAIN}`,
    fullName: "Ibrahim Sani",
    occupation: "Software engineer",
    state: "FCT - Abuja",
    city: "Gwarinpa",
    motivation:
      "I saw the Ajo conversation and wanted to do something that was not just posting about it. Verification is the part I could not do myself, so this is useful to me.",
    interests: ["technology", "agriculture", "manufacturing"],
  },
];

const BRANDS = [
  {
    email: `demo.brand@${SEED_DOMAIN}`,
    fullName: "Bola Adeniyi",
    organisation: "Ashcroft Foods Nigeria",
    industry: "Fast-moving consumer goods",
    role: "Head of Corporate Affairs",
    about:
      "A Nigerian food manufacturer supplying packaged staples to retailers nationwide. Demo organisation for development.",
    purpose:
      "We want to support small food businesses in our distribution states in a way that we can actually account for, rather than handing out cash at an event.",
    categories: ["food_and_beverage", "agriculture"],
    states: ["Lagos", "Oyo", "Kano"],
    budgetMin: 2000000,
    budgetMax: 10000000,
    target: 8,
  },
];

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email, fullName, role) {
  const existing = await findUser(email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error || !data.user) throw new Error(`${email}: ${error?.message ?? "could not create"}`);
  return data.user.id;
}

async function cleanSeed() {
  console.log("Removing seeded data...\n");
  let removed = 0;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const seeded = data.users.filter((u) => u.email?.endsWith(`@${SEED_DOMAIN}`));
    for (const user of seeded) {
      // profiles cascades to applications, media, selections and the rest.
      await admin.auth.admin.deleteUser(user.id);
      removed += 1;
      console.log(`  removed ${user.email}`);
    }
    if (data.users.length < 200) break;
  }

  console.log(`\nRemoved ${removed} seeded account${removed === 1 ? "" : "s"}.`);
}

async function seed() {
  console.log("Seeding demo data...\n");

  // ------------------------------------------------------------- alajos ---
  for (const alajo of ALAJOS) {
    const userId = await ensureUser(alajo.email, alajo.fullName, "alajo");

    const { data: existing } = await admin
      .from("alajo_applications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      console.log(`  ${alajo.businessName} already seeded`);
      continue;
    }

    const { error } = await admin.from("alajo_applications").insert({
      user_id: userId,
      // Submitted, not approved: approval still has to go through review, which
      // is the flow this seed exists to let you exercise.
      status: "submitted",
      submitted_at: new Date(Date.now() - Math.random() * 6 * 86400000).toISOString(),
      founder_name: alajo.fullName,
      date_of_birth: "1988-04-12",
      personal_phone: "08030000000",
      personal_address: `${alajo.city}, ${alajo.state}`,
      business_name: alajo.businessName,
      business_category: alajo.category,
      business_description: alajo.description,
      year_started: alajo.yearStarted,
      employee_count: alajo.employees,
      state: alajo.state,
      city: alajo.city,
      business_address: `${alajo.city}, ${alajo.state}`,
      business_phone: "08030000001",
      story: alajo.story,
      current_challenge: alajo.challenge,
      support_would_enable: alajo.enable,
      requested_amount_ngn: alajo.amount,
      decision_reason: SEED_MARKER,
      completeness: 88,
    });

    if (error) throw new Error(`${alajo.businessName}: ${error.message}`);
    console.log(`  + ${alajo.businessName} (${alajo.state})`);
  }

  // --------------------------------------------------------- supporters ---
  for (const supporter of SUPPORTERS) {
    const userId = await ensureUser(supporter.email, supporter.fullName, "supporter");
    const { data: existing } = await admin
      .from("supporter_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) continue;

    const { error } = await admin.from("supporter_profiles").insert({
      user_id: userId,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      phone: "08030000002",
      state: supporter.state,
      city: supporter.city,
      occupation: supporter.occupation,
      motivation: supporter.motivation,
      how_heard: "Seeded for development",
      interests: supporter.interests,
      decision_reason: SEED_MARKER,
    });
    if (error) throw new Error(`${supporter.email}: ${error.message}`);
    console.log(`  + supporter ${supporter.fullName}`);
  }

  // ------------------------------------------------------------- brands ---
  for (const brand of BRANDS) {
    const userId = await ensureUser(brand.email, brand.fullName, "brand");
    const { data: existing } = await admin
      .from("brand_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) continue;

    const { error } = await admin.from("brand_profiles").insert({
      user_id: userId,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      organisation_name: brand.organisation,
      industry: brand.industry,
      about: brand.about,
      contact_person_name: brand.fullName,
      contact_person_role: brand.role,
      contact_email: brand.email,
      contact_phone: "08030000003",
      support_purpose: brand.purpose,
      preferred_categories: brand.categories,
      preferred_states: brand.states,
      budget_min_ngn: brand.budgetMin,
      budget_max_ngn: brand.budgetMax,
      businesses_target: brand.target,
      decision_reason: SEED_MARKER,
    });
    if (error) throw new Error(`${brand.email}: ${error.message}`);
    console.log(`  + brand ${brand.organisation}`);
  }

  console.log(`
Done.

  ${ALAJOS.length} Alajo applications, ${SUPPORTERS.length} supporters and ${BRANDS.length} brand,
  all sitting in "submitted" so you can work them through the real review flow.

  Every seeded account uses @${SEED_DOMAIN} and the password:
    ${PASSWORD}

  Sign in as the super admin, open /admin and start approving.
  Remove all of it later with:  node --env-file=.env.local scripts/seed.mjs --clean
`);
}

(clean ? cleanSeed() : seed()).catch((err) => {
  console.error(`\nSeed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
