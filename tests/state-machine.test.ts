import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  TRANSITION_TABLES,
  assertTransition,
  canTransition,
  InvalidTransitionError,
  type TransitionEntity,
} from "@/lib/state-machine";

/**
 * The application decides which buttons to show from the TypeScript table; the
 * database refuses illegal moves using its own table. If those two ever drift,
 * the UI offers an action that the database then rejects. This test is the
 * thing that stops that happening.
 */

function parseSqlTransitions(): Set<string> {
  const sql = readFileSync(
    join(process.cwd(), "supabase", "migrations", "0002_functions_and_state_machines.sql"),
    "utf8",
  );

  const start = sql.indexOf("insert into state_transitions");
  assert.ok(start > -1, "could not find the state_transitions seed in the migration");
  const end = sql.indexOf(";", start);
  const block = sql.slice(start, end);

  const edges = new Set<string>();
  const rowPattern = /\('([a-z_]+)','([a-z_]+)','([a-z_]+)'\)/g;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(block)) !== null) {
    edges.add(`${match[1]}:${match[2]}->${match[3]}`);
  }
  return edges;
}

function typescriptTransitions(): Set<string> {
  const edges = new Set<string>();
  for (const [entity, table] of Object.entries(TRANSITION_TABLES)) {
    for (const [from, targets] of Object.entries(table as Record<string, string[]>)) {
      for (const to of targets) edges.add(`${entity}:${from}->${to}`);
    }
  }
  return edges;
}

describe("state machine", () => {
  test("TypeScript and SQL define exactly the same edges", () => {
    const sql = parseSqlTransitions();
    const ts = typescriptTransitions();

    const missingInSql = [...ts].filter((edge) => !sql.has(edge)).sort();
    const missingInTs = [...sql].filter((edge) => !ts.has(edge)).sort();

    assert.deepEqual(
      missingInSql,
      [],
      `These transitions exist in TypeScript but the database would reject them:\n  ${missingInSql.join("\n  ")}`,
    );
    assert.deepEqual(
      missingInTs,
      [],
      `The database allows these but the app never offers them:\n  ${missingInTs.join("\n  ")}`,
    );
  });

  test("the SQL seed is not empty", () => {
    assert.ok(parseSqlTransitions().size > 40, "expected a substantial transition table");
  });

  test("a status can always stay where it is", () => {
    for (const entity of Object.keys(TRANSITION_TABLES) as TransitionEntity[]) {
      for (const from of Object.keys(TRANSITION_TABLES[entity])) {
        assert.equal(canTransition(entity, from, from), true, `${entity}: ${from} -> ${from}`);
      }
    }
  });

  test("an application cannot skip review and go straight to approved from draft", () => {
    assert.equal(canTransition("application", "draft", "approved"), false);
    assert.throws(
      () => assertTransition("application", "draft", "approved"),
      InvalidTransitionError,
    );
  });

  test("a rejected application cannot be silently approved", () => {
    // It has to be reopened for review first, which is an auditable action.
    assert.equal(canTransition("application", "rejected", "approved"), false);
    assert.equal(canTransition("application", "rejected", "under_review"), true);
  });

  test("a profile cannot be published without passing through pending", () => {
    assert.equal(canTransition("alajo_profile", "private", "approved"), false);
    assert.equal(canTransition("alajo_profile", "private", "featured"), false);
    assert.equal(canTransition("alajo_profile", "private", "pending"), true);
    assert.equal(canTransition("alajo_profile", "pending", "approved"), true);
  });

  test("support cannot jump from pending to announced", () => {
    // Confirmation is what sends the congratulations email; announcing without
    // it would tell the world before telling the business.
    assert.equal(canTransition("confirmation", "pending", "announced"), false);
    assert.equal(canTransition("confirmation", "pending", "confirmed"), true);
    assert.equal(canTransition("confirmation", "confirmed", "announced"), true);
  });

  test("a selection cannot be confirmed without being shortlisted", () => {
    assert.equal(canTransition("selection", "recorded", "confirmed"), false);
    assert.equal(canTransition("selection", "recorded", "shortlisted"), true);
    assert.equal(canTransition("selection", "shortlisted", "confirmed"), true);
  });

  test("terminal states are terminal", () => {
    assert.deepEqual(TRANSITION_TABLES.campaign.completed, []);
    assert.deepEqual(TRANSITION_TABLES.campaign.cancelled, []);
    assert.deepEqual(TRANSITION_TABLES.confirmation.completed, []);
    assert.deepEqual(TRANSITION_TABLES.selection.declined, []);
    assert.deepEqual(TRANSITION_TABLES.selection.withdrawn, []);
  });

  test("every target state is itself a known state for that entity", () => {
    for (const [entity, table] of Object.entries(TRANSITION_TABLES)) {
      const known = new Set(Object.keys(table));
      for (const [from, targets] of Object.entries(table as Record<string, string[]>)) {
        for (const to of targets) {
          assert.ok(known.has(to), `${entity}: ${from} -> ${to} points at an unknown state`);
        }
      }
    }
  });
});
