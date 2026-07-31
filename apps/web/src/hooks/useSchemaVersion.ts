// Reference React Query hook — AR-4 (LIF-75). Proves the data plane end-to-end:
// queryFn → a @vida/core read → the local SQLite driver (via the D5 worker client),
// with NO HTTP (BR-RT-3). `getSchemaVersion` is the only vault-free foundation
// read at M1.0 (createRepository is vault-gated). The per-module entity hooks
// (`useTasks`, …) follow this shape in their own waves.
import { useQuery } from '@tanstack/react-query'
import { getSchemaVersion } from '@vida/core'
import { getDbClient } from '../db/boot'

export function useSchemaVersion() {
  return useQuery({
    queryKey: ['schema-version'],
    queryFn: () => getSchemaVersion(getDbClient().driver),
  })
}
