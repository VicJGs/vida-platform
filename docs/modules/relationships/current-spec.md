# Relationships (CRM) — current spec (contract/structure)
# Durable §XXIX currency doc. Module: mod-relationships #56 · LIF-137 · `createRelationshipsService`.

## Service: `createRelationshipsService(deps): RelationshipsService`
`services/relationships/{service.ts, types.ts, index.ts}` — object-literal factory; intra-service calls hoisted to
closures (not `this.`). Deps GROW per slice. **S1 deps:** `{ db: DrizzleDb; deviceId: string }`.

Composes DB-4 `025_relationships` (8 tables): `contacts` (soft-delete) · `contact_events` · `interactions` ·
`contact_reminders` · `reminder_groups` · `reminder_group_contacts` · `network_groups` · `network_group_contacts`
(children/junctions hard-delete). Repos built with `encryptedFields:[]` (M1.0 pass-through).

## Surface — S1 (built)
```ts
createContact(input: CreateContactInput): Promise<ContactView>
updateContact(id: string, patch: UpdateContactInput): Promise<ContactView>   // ContactNotFoundError (missing/soft-deleted)
softDeleteContact(id: string): Promise<void>                                  // soft + app-layer cascade (RL-2); idempotent
listContacts(filter?: ListContactsFilter): Promise<ContactView[]>            // active-only (findAll+JS filter); relationship_type?, is_favorite?
getContact(id: string): Promise<ContactView | null>                          // soft-delete-aware
toggleFavorite(id: string): Promise<ContactView>                             // ContactNotFoundError (missing/soft-deleted)
```
- `ContactView = Omit<ContactRow,'social_links'> & { social_links: SocialLinks | null }` (JSON boundary; `types.ts`).
- `CreateContactInput`/`UpdateContactInput` = Zod-inferred (`validators/relationship.ts`): `CreateContactSchema`
  requires `first_name` only; `UpdateContactSchema` = full partial. `SocialLinksSchema` = typed object.
- Error: `ContactNotFoundError` (`types.ts`).
- Barrel: `export * from './services/relationships'` in `@vida/core` index.

## Validators (`validators/relationship.ts`)
Enum schemas (`RelationshipTypeSchema`/`InteractionTypeSchema`/`SentimentSchema`/`ContactEventTypeSchema`/
`ReminderGroupAnchorSchema`) + `SocialLinksSchema` + `CreateContactSchema`/`UpdateContactSchema`. `FrequencySchema`
re-imported from `./common` (canonical; no redefine). `PRIORITY` canonical in `./common` (ContactReminder, S4).

## @vida/types (`relationship.ts`) — DB-11 reconciled to the schema floor
Enums: `RELATIONSHIP_TYPE`(9) · `INTERACTION_TYPE`(8) · `SENTIMENT`(3) · `CONTACT_EVENT_TYPE`(4) ·
`REMINDER_GROUP_ANCHOR`(2). Interfaces: `Contact` (no `tags`; +`how_we_met`/`closeness_tier`) · `ContactEvent` ·
`Interaction` (+energy/key_takeaways) · `ContactReminder` (+snooze/priority) · `ReminderGroup` (+anchor) ·
`ReminderGroupContact` · `NetworkGroup` · `NetworkGroupContact`. `SocialLinks` typed JSON.

## Test / Verification Gate
`services/relationships/__tests__/service.test.ts` — better-sqlite3 live-store (Node-ABI-matched; `migrate()` applies
`025_relationships`). S1: 10/10 green. **Note:** the better-sqlite3 prebuilt binary is pinned to one
NODE_MODULE_VERSION — run the gate under the Node the install compiled it against (here Node 22, ABI 127); an ABI
error is environment, not a code failure (`pnpm rebuild better-sqlite3` to switch Node).
