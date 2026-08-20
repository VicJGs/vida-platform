// ============================================================================
// Migration 020 — Finance (+ Fiscal & Legal)  (DB-4 · group #9 · ADR-002 §5.8 + §5.20)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The ninth DB-4 Stream (ii)
// domain migration. Mirrors schema/finance.ts. Authors the 6 §5.8 finance tables
// (fresh — they lived in the pre-rebuild monolith) + the 3 net-new Fiscal & Legal
// tables (§5.20 L3828) + the jurisdiction_code link + the category_bidx blind index.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-finance-and-fiscal-legal/_index.md §P3.
// 9 tables: accounts · transactions · assets · liabilities · investments · income_streams
//           · fiscal_residencies · legal_entities · fiscal_obligations
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) + deleted_at on all 9.
// NO cross/within-domain FK — account_id/transfer_to_account_id/project_id/owner_id/linked_task_id
// are plain TEXT (no-FK, current-spec.md:176-177; §5.8 REFERENCES superseded by ADR-016 §3.4;
// cascade/orphan = app-layer FN-11). FIXED enums → SQL CHECK from the @vida/types tuple.
// OPEN vocabs (currency, jurisdiction_code, category_bidx, residency_type, entity_type,
// obligation_type, obligation status) = plain TEXT, no CHECK. category_bidx = P-side equality
// blind index (F7); the keyed-BLAKE2b derivation is service-layer (deferred). Inline transactions.tags
// RETIRED → entity_tags (FN-10). Finance nullability = §5.8; fiscal nullability = the
// fiscal-legal/structure-data.md roster ?-notation (nullable = residencies.end_date,
// legal_entities.project_id, obligations.linked_task_id; all else NOT NULL).
// ============================================================================

import type { Migration } from '../adapter'

export const migration020Finance: Migration = {
  version: 20,
  name: 'finance',
  up: async (driver) => {
    // --- accounts: money stores ---
    await driver.run(`
      CREATE TABLE accounts (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        account_type      TEXT NOT NULL
                          CHECK (account_type IN (
                            'checking', 'savings', 'credit_card', 'investment',
                            'cash', 'digital_wallet', 'other'
                          )),
        institution       TEXT,            -- [E]
        currency          TEXT NOT NULL DEFAULT 'USD',   -- OPEN (ISO), no CHECK
        current_balance   INTEGER NOT NULL DEFAULT 0,    -- [E] cents
        opening_balance   INTEGER,         -- [E] cents; NEW (FN-3), nullable
        credit_limit      INTEGER,         -- [E] cents
        interest_rate     INTEGER,         -- [E] basis points
        is_active         INTEGER NOT NULL DEFAULT 1,
        color             TEXT,
        icon              TEXT,
        jurisdiction_code TEXT,            -- NEW (FL-9); OPEN, nullable
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- transactions: the ledger ---
    await driver.run(`
      CREATE TABLE transactions (
        id                     TEXT PRIMARY KEY,
        account_id             TEXT NOT NULL,   -- no FK (was CASCADE); app-layer FN-11
        transfer_to_account_id TEXT,            -- no FK (was SET NULL)
        transaction_type       TEXT NOT NULL
                               CHECK (transaction_type IN ('income', 'expense', 'transfer')),
        amount                 INTEGER NOT NULL,   -- [E] cents
        currency               TEXT NOT NULL DEFAULT 'USD',
        category               TEXT,            -- [E]
        category_bidx          TEXT,            -- NEW (F7); P-side equality blind index, no CHECK
        subcategory            TEXT,            -- [E]
        description            TEXT,            -- [E]
        date                   TEXT NOT NULL,   -- YYYY-MM-DD
        is_recurring           INTEGER NOT NULL DEFAULT 0,
        recurring_frequency    TEXT
                               CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        jurisdiction_code      TEXT,            -- NEW (FL-9)
        created_at             INTEGER NOT NULL,
        updated_at             INTEGER NOT NULL,
        deleted_at             INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_transactions_account ON transactions(account_id)`)
    await driver.run(`CREATE INDEX idx_transactions_date ON transactions(date)`)
    await driver.run(`CREATE INDEX idx_transactions_category_bidx ON transactions(category_bidx)`)

    // --- assets: owned value ---
    await driver.run(`
      CREATE TABLE assets (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        asset_type        TEXT NOT NULL
                          CHECK (asset_type IN (
                            'real_estate', 'vehicle', 'electronics', 'jewelry', 'collectible', 'other'
                          )),
        purchase_date     TEXT,
        purchase_price    INTEGER,         -- [E] cents
        current_value     INTEGER,         -- [E] cents
        depreciation_rate INTEGER,         -- [E] basis points / year
        location          TEXT,            -- [E]
        jurisdiction_code TEXT,            -- NEW (FL-9)
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- liabilities: debts (+ G9 restored) ---
    await driver.run(`
      CREATE TABLE liabilities (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        liability_type    TEXT NOT NULL
                          CHECK (liability_type IN (
                            'mortgage', 'student_loan', 'auto_loan', 'credit_card',
                            'personal_loan', 'medical', 'other'
                          )),
        original_amount   INTEGER,         -- [E] cents
        current_balance   INTEGER,         -- [E] cents
        interest_rate     INTEGER,         -- [E] basis points
        monthly_payment   INTEGER,         -- [E] cents
        due_date          TEXT,
        lender            TEXT,            -- [E]
        payment_frequency TEXT             -- NEW (G9)
                          CHECK (payment_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        next_payment_date TEXT,            -- NEW (G9)
        interest_type     TEXT             -- NEW (G9)
                          CHECK (interest_type IN ('fixed', 'variable')),
        payoff_date       TEXT,            -- NEW (G9)
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- investments: holdings ---
    await driver.run(`
      CREATE TABLE investments (
        id                TEXT PRIMARY KEY,
        account_id        TEXT,            -- no FK (was SET NULL); nullable
        name              TEXT NOT NULL,   -- [E]
        investment_type   TEXT NOT NULL
                          CHECK (investment_type IN (
                            'stock', 'bond', 'mutual_fund', 'etf', 'crypto',
                            'real_estate', 'commodity', 'other'
                          )),
        ticker_symbol     TEXT,            -- [E]
        quantity          REAL,            -- [E]
        purchase_price    INTEGER,         -- [E] cents / unit
        current_price     INTEGER,         -- [E] cents / unit
        jurisdiction_code TEXT,            -- NEW (FL-9)
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_investments_account ON investments(account_id)`)

    // --- income_streams: income (+ G9 next_payment_date) ---
    await driver.run(`
      CREATE TABLE income_streams (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        income_type       TEXT NOT NULL
                          CHECK (income_type IN (
                            'salary', 'freelance', 'investment', 'rental', 'business',
                            'side_hustle', 'passive', 'other'
                          )),
        work_type         TEXT
                          CHECK (work_type IN ('full_time', 'part_time', 'contract', 'freelance', 'passive')),
        amount            INTEGER NOT NULL,   -- [E] cents
        frequency         TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        is_active         INTEGER NOT NULL DEFAULT 1,
        employer          TEXT,            -- [E] PII
        start_date        TEXT,
        end_date          TEXT,
        next_payment_date TEXT,            -- NEW (G9)
        jurisdiction_code TEXT,            -- NEW (FL-9)
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // ========================================================================
    // Fiscal & Legal sub-context (net-new — §5.20 L3828)
    // ========================================================================

    // --- fiscal_residencies: SITUATE spine ---
    await driver.run(`
      CREATE TABLE fiscal_residencies (
        id                TEXT PRIMARY KEY,
        owner_type        TEXT NOT NULL
                          CHECK (owner_type IN ('user', 'legal_entity')),
        owner_id          TEXT NOT NULL,   -- no FK
        jurisdiction_code TEXT NOT NULL,   -- OPEN, no CHECK
        residency_type    TEXT NOT NULL,   -- OPEN (per-jurisdiction, rule-pack), no CHECK
        start_date        TEXT NOT NULL,
        end_date          TEXT,            -- roster ?
        notes             TEXT NOT NULL,   -- [E]
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- legal_entities: composes Projects ---
    await driver.run(`
      CREATE TABLE legal_entities (
        id                TEXT PRIMARY KEY,
        project_id        TEXT,            -- roster ?; no FK (cross-domain, Projects)
        name              TEXT NOT NULL,   -- [E]
        entity_type       TEXT NOT NULL,   -- OPEN (per-jurisdiction), no CHECK
        jurisdiction_code TEXT NOT NULL,   -- OPEN, no CHECK
        registration_ref  TEXT NOT NULL,   -- [E]
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- fiscal_obligations: derived, user-confirmable ---
    await driver.run(`
      CREATE TABLE fiscal_obligations (
        id                      TEXT PRIMARY KEY,
        jurisdiction_code       TEXT NOT NULL,   -- OPEN, no CHECK
        owner_type              TEXT NOT NULL
                                CHECK (owner_type IN ('user', 'legal_entity')),
        owner_id                TEXT NOT NULL,   -- no FK
        obligation_type         TEXT NOT NULL,   -- OPEN (per-jurisdiction, rule-pack), no CHECK
        due_date                TEXT NOT NULL,   -- YYYY-MM-DD
        status                  TEXT NOT NULL,   -- OPEN (app/rule-pack lifecycle), no CHECK
        source_rulepack_version TEXT NOT NULL,
        linked_task_id          TEXT,            -- roster ?; no FK (→ Tasks on confirm, FL-6)
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL,
        deleted_at              INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
  },
}
