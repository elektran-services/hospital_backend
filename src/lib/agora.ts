import { RtcTokenBuilder, RtcRole } from "agora-token";

/**
 * Configuration for Agora token generation
 */
interface AgoraTokenConfig {
  appId: string;
  appCertificate: string;
}

/**
 * Options for generating an Agora RTC token using account (string-based identifier)
 */
interface GenerateTokenOptions {
  channelName: string;
  userAccount: string;
  role: number;
  expirationInSeconds?: number;
  appId?: string;           // Optional: use seeded DB value instead of env var
  appCertificate?: string;  // Optional: use seeded DB value instead of env var
}

/**
 * Response from token generation
 */
interface AgoraTokenResponse {
  token: string;
  channelName: string;
  account: string;
  expiresAt: number;
  expiresIn: number;
}

/**
 * Validates required Agora configuration
 * Accepts optional overrides for database-seeded values
 * Falls back to environment variables if not provided
 * @throws Error if required config is missing
 */
function validateConfig(
  overrideAppId?: string,
  overrideAppCertificate?: string
): AgoraTokenConfig {
  let appId = overrideAppId || process.env.AGORA_APP_ID;
  let appCertificate =
    overrideAppCertificate || process.env.AGORA_APP_CERTIFICATE;
  
  // Remove quotes and trim whitespace for both appId and certificate
  if (appId) {
    appId = appId
      .trim()
      .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
      .trim();
  }
  if (appCertificate) {
    appCertificate = appCertificate
      .trim()
      .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
      .trim();
  }

  console.log("🔍 Agora Config Validation:", {
    appIdSource: overrideAppId ? "database" : "environment",
    appIdSet: !!appId,
    appIdLength: appId?.length || 0,
    certificateSource: overrideAppCertificate ? "database" : "environment",
    certificateSet: !!appCertificate,
    certificateLength: appCertificate?.length || 0,
  });

  if (!appId) {
    throw new Error("Missing required Agora App ID (env or database)");
  }

  if (!appCertificate) {
    throw new Error(
      "Missing required Agora App Certificate (env or database)"
    );
  }

  return { appId, appCertificate };
}

/**
 * Generates an Agora RTC access token for a user to join a channel
 * Uses account-based (string) authentication instead of numeric UIDs
 *
 * @param options - Token generation options
 * @returns AgoraTokenResponse containing the token and metadata
 * @throws Error if token generation fails or config is invalid
 *
 * @example
 * const response = generateAgoraToken({
 *   channelName: 'branch_123_doctor_456_patient_789',
 *   account: 'doctor_456',
 *   role: 'subscriber',
 *   expirationInSeconds: 86400
 * });
 */
export function generateAgoraToken(
  options: GenerateTokenOptions
): AgoraTokenResponse {
  const { channelName, userAccount, role, expirationInSeconds = 86400, appId, appCertificate } =
    options;

  // Validate inputs
  if (!channelName || channelName.trim().length === 0) {
    throw new Error("Channel name is required and cannot be empty");
  }

  if (typeof userAccount !== "string" || userAccount.trim().length === 0) {
    throw new Error("User account must be a non-empty string");
  }

  if (userAccount.length > 255) {
    throw new Error("User account must be 255 characters or less");
  }

  if (role !== RtcRole.PUBLISHER && role !== RtcRole.SUBSCRIBER) {
    throw new Error('Role must be RtcRole.PUBLISHER or RtcRole.SUBSCRIBER');
  }

  if (
    !Number.isInteger(expirationInSeconds) ||
    expirationInSeconds < 0 ||
    expirationInSeconds > 2147483647
  ) {
    throw new Error(
      "Expiration time must be a positive integer representing seconds"
    );
  }

  try {
    const config = validateConfig(appId, appCertificate);

    // Build token with user account (string-based identifier)
    let tokenString: string;
    
    try {
      tokenString = RtcTokenBuilder.buildTokenWithUserAccount(
        config.appId,
        config.appCertificate,
        channelName,
        userAccount,
        role,
        expirationInSeconds,
        expirationInSeconds
      );
    } catch (builderError) {
      console.error("❌ RtcTokenBuilder threw error:", {
        error: builderError instanceof Error ? builderError.message : String(builderError),
        stack: builderError instanceof Error ? builderError.stack : undefined,
      });
      throw builderError;
    }

    if (!tokenString || tokenString === "") {
      throw new Error(
        `RtcTokenBuilder returned empty token. Params were: channelName=${channelName}, userAccount=${userAccount}, role=${role}, expirationInSeconds=${expirationInSeconds}`
      );
    }

    console.log("✅ Token generated successfully:", {
      channelName,
      userAccount,
      role: role === RtcRole.PUBLISHER ? "PUBLISHER" : "SUBSCRIBER",
      tokenLength: tokenString.length,
      tokenPreview: tokenString.substring(0, 50),
    });

    const now = Date.now();
    const expiresAt = now + expirationInSeconds * 1000;

    return {
      token: tokenString,
      channelName,
      account: userAccount,
      expiresAt,
      expiresIn: expirationInSeconds,
    };
  } catch (error) {
    console.error("❌ Token generation error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    if (error instanceof Error && error.message.includes("Missing required")) {
      throw error;
    }
    throw new Error(
      `Failed to generate Agora token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generates a simple hash from a string for channel naming
 * @param str - The string to hash
 * @returns A short alphanumeric hash
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and take first 8 characters
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Generates a channel name for a video call between a doctor and patient
 * Channel naming convention: call_<hash> (max 60 characters, alphanumeric only)
 * The hash is generated from branch, doctor, and patient IDs to ensure uniqueness
 *
 * @param branchId - The branch ID (UUID)
 * @param doctorId - The doctor's user ID (UUID)
 * @param patientId - The patient's user ID (UUID)
 * @returns A unique channel name (under 60 chars, no special characters)
 */
export function generateChannelName(
  branchId: string,
  doctorId: string,
  patientId: string
): string {
  if (!branchId || !doctorId || !patientId) {
    throw new Error(
      "branchId, doctorId, and patientId are all required to generate channel name"
    );
  }

  // Create a unique identifier by combining all three IDs
  const combined = `${branchId}${doctorId}${patientId}`;
  
  // Generate a hash for compact representation
  const hash = simpleHash(combined);
  
  // Channel name: call_<hash> (total: 13 characters, well under 60 limit)
  const channelName = `call${hash}`;
  
  if (channelName.length > 60) {
    throw new Error("Generated channel name exceeds 60 character limit");
  }

  return channelName;
}

/**
 * Converts a UUID string to an account string for Agora
 * Uses the UUID as the account identifier
 *
 * @param uuid - The UUID string
 * @returns The UUID as account string for Agora authentication
 */
export function uuidToAccount(uuid: string): string {
  if (!uuid || typeof uuid !== "string") {
    throw new Error("UUID must be a non-empty string");
  }

  // Return the UUID itself as the account identifier
  // Agora accepts string accounts up to 255 characters
  return uuid;
}
