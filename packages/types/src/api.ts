// ============================================================================
// API Types — @vida/types
// Hono sync server request/response contracts
// ADR-001 §14 · ADR-003 §4, §10
// ============================================================================

import type { Timestamp } from './common'
import type { SyncBlobHeader } from './sync'

// ---------------------------------------------------------------------------
// Auth — SRP (Secure Remote Password)
// ---------------------------------------------------------------------------

export interface SrpRegistrationRequest {
  email: string
  salt: string
  verifier: string
}

export interface SrpRegistrationResponse {
  user_id: string
}

export interface SrpChallengeRequest {
  email: string
  client_public: string
}

export interface SrpChallengeResponse {
  salt: string
  server_public: string
}

export interface SrpVerifyRequest {
  email: string
  client_proof: string
}

export interface SrpVerifyResponse {
  server_proof: string
  session_token: string
  /** Seconds until token expires */
  expires_in: number
}

export interface SrpRefreshRequest {
  session_token: string
}

export interface SrpRefreshResponse {
  session_token: string
  expires_in: number
}

// ---------------------------------------------------------------------------
// Sync — push / pull
// ---------------------------------------------------------------------------

export interface SyncPushBlob {
  header: SyncBlobHeader
  /** base64-encoded encrypted payload */
  encrypted_payload: string
}

export interface SyncPushRequest {
  blobs: SyncPushBlob[]
}

export interface SyncRejection {
  row_id: string
  reason: 'conflict' | 'invalid' | 'error'
  server_lww_ts?: Timestamp
  message?: string
}

export interface SyncPushResponse {
  accepted: string[]
  rejected: SyncRejection[]
  server_time: Timestamp
}

export interface SyncPullRequest {
  since: Timestamp
  /** Filter to specific tables — omit for all */
  tables?: string[]
  /** Max blobs to return per pull (pagination) */
  limit?: number
}

export interface SyncPullResponse {
  blobs: SyncPushBlob[]
  server_time: Timestamp
  /** True if there are more blobs to pull */
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Attachments — R2 signed URL pipeline (ADR-003 §4.3)
// ---------------------------------------------------------------------------

export interface AttachmentUploadUrlRequest {
  attachment_id: string
  size_bytes: number
  mime_type: string
}

export interface AttachmentUploadUrlResponse {
  /** Time-limited R2 signed upload URL */
  upload_url: string
  /** R2 object key for reference */
  r2_key: string
  expires_at: Timestamp
}

export interface AttachmentDownloadUrlRequest {
  attachment_id: string
}

export interface AttachmentDownloadUrlResponse {
  download_url: string
  expires_at: Timestamp
}

// ---------------------------------------------------------------------------
// Device management
// ---------------------------------------------------------------------------

export const DEVICE_PLATFORM = ['web', 'ios', 'android', 'macos', 'windows', 'linux'] as const
export type DevicePlatform = (typeof DEVICE_PLATFORM)[number]

export interface DeviceRegistration {
  device_id: string
  device_name: string
  platform: DevicePlatform
  registered_at: Timestamp
  last_seen_at: Timestamp
}

export interface RegisterDeviceRequest {
  device_name: string
  platform: DevicePlatform
}

export interface RegisterDeviceResponse {
  device_id: string
}

export interface ListDevicesResponse {
  devices: DeviceRegistration[]
}

export interface RevokeDeviceRequest {
  device_id: string
}

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------

export interface DeleteAccountRequest {
  /** Client proof to confirm identity */
  client_proof: string
}

export interface ExportDataResponse {
  /** Signed URL to download the full encrypted export archive */
  download_url: string
  expires_at: Timestamp
}

// ---------------------------------------------------------------------------
// Generic response wrapper
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

// ---------------------------------------------------------------------------
// Server health
// ---------------------------------------------------------------------------

export interface HealthCheckResponse {
  status: 'ok' | 'degraded'
  version: string
  timestamp: Timestamp
}
