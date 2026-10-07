import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const appRole = v.union(
  v.literal("admin"),
  v.literal("caster"),
  v.literal("ambassador"),
  v.literal("player"),
);

const playerStatus = v.union(
  v.literal("pool"),
  v.literal("in_auction"),
  v.literal("sold"),
  v.literal("unsold"),
  v.literal("retained"),
);

const auctionStatus = v.union(
  v.literal("not_started"),
  v.literal("live"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("stopped"),
);

const gameRole = v.union(
  v.literal("primary_rusher"),
  v.literal("secondary_rusher"),
  v.literal("sniper"),
  v.literal("nader"),
  v.literal("supporter"),
);

const nullableId = (table: Parameters<typeof v.id>[0]) => v.optional(v.id(table));

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    isActive: v.boolean(),
    mustChangePassword: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_username", ["username"]),

  userRoles: defineTable({
    userId: v.id("users"),
    role: appRole,
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"])
    .index("by_user_and_role", ["userId", "role"]),

  players: defineTable({
    userId: v.id("users"),
    playerName: v.string(),
    ingameName: v.string(),
    gameId: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    primaryRole: gameRole,
    secondaryRole: v.optional(gameRole),
    info: v.optional(v.string()),
    experience: v.optional(v.string()),
    teamName: v.optional(v.string()),
    status: playerStatus,
    soldPrice: v.optional(v.number()),
    ambassadorId: nullableId("ambassadors"),
    soldAt: v.optional(v.number()),
    lotNumber: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_game_id", ["gameId"])
    .index("by_status", ["status"])
    .index("by_ambassador_id", ["ambassadorId"])
    .index("by_status_and_lot_number", ["status", "lotNumber"]),

  ambassadors: defineTable({
    userId: v.id("users"),
    ambassadorName: v.string(),
    teamName: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    info: v.optional(v.string()),
    discord: v.optional(v.string()),
    startingPoints: v.number(),
    remainingPoints: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_team_name", ["teamName"])
    .index("by_remaining_points", ["remainingPoints"]),

  casters: defineTable({
    userId: v.id("users"),
    casterName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"]),

  playerContacts: defineTable({
    playerId: v.id("players"),
    userId: v.id("users"),
    phoneNumber: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_user_id", ["userId"]),

  playerMedia: defineTable({
    playerId: v.id("players"),
    kind: v.union(v.literal("photo"), v.literal("video")),
    storageId: v.id("_storage"),
    sizeBytes: v.number(),
    contentType: v.string(),
    createdAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_player_and_kind", ["playerId", "kind"]),

  auctionState: defineTable({
    key: v.literal("primary"),
    status: auctionStatus,
    currentPlayerId: nullableId("players"),
    currentBid: v.optional(v.number()),
    currentBidderId: nullableId("ambassadors"),
    basePrice: v.number(),
    minIncrement: v.number(),
    lotCounter: v.number(),
    maxPlayers: v.number(),
    maxAmbassadors: v.number(),
    maxCasters: v.number(),
    maxRetains: v.number(),
    retainPrice: v.number(),
    defaultStartingPoints: v.number(),
    biddingDeadlineAt: v.optional(v.number()),
    biddingOpen: v.boolean(),
    biddingSecondsRemaining: v.optional(v.number()),
    casterOwnerId: v.optional(v.id("users")),
    casterSessionId: v.optional(v.string()),
    casterHeartbeatAt: v.optional(v.number()),
    casterLeaseUntil: v.optional(v.number()),
    casterCamLive: v.boolean(),
    casterStreamUrl: v.optional(v.string()),
    tournamentName: v.string(),
    tournamentSeason: v.optional(v.string()),
    tournamentLogoUrl: v.optional(v.string()),
    auctionBranding: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  bids: defineTable({
    playerId: v.id("players"),
    ambassadorId: v.id("ambassadors"),
    amount: v.number(),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_ambassador_id", ["ambassadorId"])
    .index("by_player_and_created_at", ["playerId", "createdAt"])
    .index("by_idempotency_key", ["idempotencyKey"]),

  auctionEvents: defineTable({
    eventType: v.string(),
    message: v.string(),
    playerId: nullableId("players"),
    ambassadorId: nullableId("ambassadors"),
    amount: v.optional(v.number()),
    actorUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_player_id", ["playerId"])
    .index("by_ambassador_id", ["ambassadorId"]),

  auctionResults: defineTable({
    playerId: v.id("players"),
    ambassadorId: nullableId("ambassadors"),
    winningBid: v.optional(v.number()),
    status: v.union(v.literal("sold"), v.literal("unsold")),
    soldAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_ambassador_id", ["ambassadorId"]),

  retainRecords: defineTable({
    playerId: v.id("players"),
    ambassadorId: v.id("ambassadors"),
    retainPrice: v.number(),
    isLocked: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_player_id", ["playerId"])
    .index("by_ambassador_id", ["ambassadorId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_read_at", ["userId", "readAt"]),

  casterSessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    state: v.union(
      v.literal("claiming"),
      v.literal("live"),
      v.literal("reconnecting"),
      v.literal("released"),
      v.literal("expired"),
    ),
    heartbeatAt: v.number(),
    leaseUntil: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_session_id", ["sessionId"])
    .index("by_state", ["state"]),

  auditEvents: defineTable({
    actorUserId: v.optional(v.id("users")),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_actor_user_id", ["actorUserId"])
    .index("by_target", ["targetType", "targetId"]),

  appSettings: defineTable({
    key: v.literal("primary"),
    maintenanceMode: v.boolean(),
    allowPlayerRegistration: v.boolean(),
    allowAmbassadorRegistration: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
