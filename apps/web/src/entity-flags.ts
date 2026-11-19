// Services in the composition root that have not closed Live yet (LIF-351). check:entity-live exempts each one from
// its route tag, use<Entity> hook and @entity e2e checks; Tasks is the only Live entity (LIF-389). A module removes
// its own line in its live close (Notes LIF-430, Journals LIF-407, Preferences LIF-440, and each module's Live slice).
// The app does not read this file.
export const notLive = ['notes', 'journals', 'preferences', 'sessions', 'habits', 'purposes', 'relationships']
