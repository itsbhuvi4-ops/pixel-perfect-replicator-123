import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, requireAmbassador, requireCaster } from "./authz";

async function getState(ctx: any) {
  const state = await ctx.db.query("auctionState")
    .withIndex("by_key", q => q.eq("key", "primary")).unique();
  if (!state) throw new Error("Auction is not configured");
  return state;
}

export const publicState = query({
  args: {},
  handler: async ctx => {
    const state = await getState(ctx);
    return {
      id: state._id,
      status: state.status,
      current_player_id: state.currentPlayerId,
      current_bid: state.currentBid ?? null,
      current_bidder_id: state.currentBidderId ?? null,
      base_price: state.basePrice,
      min_increment: state.minIncrement,
      lot_counter: state.lotCounter,
      max_players: state.maxPlayers,
      max_ambassadors: state.maxAmbassadors,
      max_casters: state.maxCasters,
      tournament_name: state.tournamentName,
      tournament_season: state.tournamentSeason ?? null,
      default_starting_points: state.defaultStartingPoints,
      retain_price: state.retainPrice,
      max_retains: state.maxRetains,
      caster_cam_live: Boolean(state.casterCamLive && (state.casterLeaseUntil ?? 0) > Date.now()),
      bidding_open: state.biddingOpen,
      bidding_deadline_at: state.biddingDeadlineAt ?? null,
      updated_at: state.updatedAt,
      caster_session_id: state.casterSessionId ?? null,
    };
  },
});

export const state = query({
  args: {},
  handler: async ctx => getState(ctx),
});

export const initialize = mutation({
  args: {
    tournamentName: v.string(), tournamentSeason: v.optional(v.string()),
    basePrice: v.number(), minIncrement: v.number(),
    defaultStartingPoints: v.number(), retainPrice: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    const now = Date.now();
    const data = {
      key: "primary" as const, status: "not_started" as const,
      currentPlayerId: null, currentBid: null, currentBidderId: null,
      basePrice: args.basePrice, minIncrement: args.minIncrement, lotCounter: 0,
      maxPlayers: 0, maxAmbassadors: 0, maxCasters: 0, maxRetains: 0,
      retainPrice: args.retainPrice, defaultStartingPoints: args.defaultStartingPoints,
      biddingOpen: false, casterCamLive: false,
      tournamentName: args.tournamentName, tournamentSeason: args.tournamentSeason,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return ctx.db.insert("auctionState", data);
  },
});

export const start = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (state.status !== "not_started" && state.status !== "paused") throw new Error("Auction cannot be started from its current state");
    await ctx.db.patch(state._id, { status: "live", updatedAt: Date.now() });
    await ctx.db.insert("auctionEvents", { eventType: "AUCTION_STARTED", message: "Auction started", actorUserId: user._id, createdAt: Date.now() });
    return null;
  },
});

export const pause = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (state.status !== "live") throw new Error("Auction is not live");
    await ctx.db.patch(state._id, { status: "paused", biddingOpen: false, updatedAt: Date.now() });
    await ctx.db.insert("auctionEvents", { eventType: "AUCTION_PAUSED", message: "Auction paused", actorUserId: user._id, createdAt: Date.now() });
    return null;
  },
});

export const resume = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (state.status !== "paused") throw new Error("Auction is not paused");
    await ctx.db.patch(state._id, { status: "live", updatedAt: Date.now() });
    await ctx.db.insert("auctionEvents", { eventType: "AUCTION_RESUMED", message: "Auction resumed", actorUserId: user._id, createdAt: Date.now() });
    return null;
  },
});

export const stop = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (state.status === "completed" || state.status === "stopped") throw new Error("Auction is already ended");
    await ctx.db.patch(state._id, { status: "stopped", biddingOpen: false, updatedAt: Date.now() });
    await ctx.db.insert("auctionEvents", { eventType: "AUCTION_STOPPED", message: "Auction stopped", actorUserId: user._id, createdAt: Date.now() });
    return null;
  },
});

export const revealNextRandom = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (state.status !== "live") throw new Error("Auction must be live");
    if (state.currentPlayerId) throw new Error("Current player must be finalized first");

    const pool = await ctx.db.query("players").withIndex("by_status", q => q.eq("status", "pool")).collect();
    if (pool.length === 0) {
      await ctx.db.patch(state._id, { status: "completed", biddingOpen: false, updatedAt: Date.now() });
      return null;
    }

    const player = pool[Math.floor(Math.random() * pool.length)];
    const now = Date.now();
    await ctx.db.patch(player._id, { status: "in_auction", lotNumber: state.lotCounter + 1, updatedAt: now });
    await ctx.db.patch(state._id, {
      currentPlayerId: player._id, currentBid: state.basePrice, currentBidderId: null,
      biddingOpen: false, biddingDeadlineAt: null, biddingSecondsRemaining: null,
      lotCounter: state.lotCounter + 1, updatedAt: now,
    });
    await ctx.db.insert("auctionEvents", {
      eventType: "PLAYER_REVEALED", message: "Player revealed", playerId: player._id,
      actorUserId: user._id, createdAt: now,
    });
    return player._id;
  },
});

export const openBidding = mutation({
  args: { durationSeconds: v.number() },
  handler: async (ctx, args) => {
    await requireCaster(ctx);
    const state = await getState(ctx);
    if (!state.currentPlayerId || state.status !== "live") throw new Error("No active player");
    const duration = Math.max(5, Math.min(300, Math.floor(args.durationSeconds)));
    const deadline = Date.now() + duration * 1000;
    await ctx.db.patch(state._id, {
      biddingOpen: true, biddingDeadlineAt: deadline,
      biddingSecondsRemaining: duration, updatedAt: Date.now(),
    });
    return null;
  },
});

export const placeBid = mutation({
  args: { amount: v.number(), idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAmbassador(ctx);
    const ambassador = await ctx.db.query("ambassadors").withIndex("by_user_id", q => q.eq("userId", user._id)).unique();
    if (!ambassador) throw new Error("Ambassador profile not found");

    const state = await getState(ctx);
    if (state.status !== "live" || !state.biddingOpen || !state.currentPlayerId || !state.biddingDeadlineAt) throw new Error("Bidding is closed");
    if (Date.now() >= state.biddingDeadlineAt) throw new Error("Bidding deadline has passed");
    if (state.currentBidderId === ambassador._id) throw new Error("Current bidder cannot bid again");

    const minimum = (state.currentBid ?? state.basePrice) + state.minIncrement;
    if (args.amount < minimum) throw new Error(`Minimum bid is ${minimum}`);
    if (args.amount > ambassador.remainingPoints) throw new Error("Insufficient points");

    const duplicate = await ctx.db.query("bids").withIndex("by_idempotency_key", q => q.eq("idempotencyKey", args.idempotencyKey)).unique();
    if (duplicate) return { bidId: duplicate._id, amount: duplicate.amount };

    const now = Date.now();
    const bidId = await ctx.db.insert("bids", {
      playerId: state.currentPlayerId, ambassadorId: ambassador._id,
      amount: args.amount, idempotencyKey: args.idempotencyKey, createdAt: now,
    });
    await ctx.db.patch(state._id, {
      currentBid: args.amount, currentBidderId: ambassador._id, updatedAt: now,
    });
    await ctx.db.insert("auctionEvents", {
      eventType: "BID_PLACED", message: "Bid placed",
      playerId: state.currentPlayerId, ambassadorId: ambassador._id,
      amount: args.amount, actorUserId: user._id, createdAt: now,
    });
    return { bidId, amount: args.amount };
  },
});

export const finalize = mutation({
  args: {},
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await getState(ctx);
    if (!state.currentPlayerId) return null;
    if (state.biddingDeadlineAt && Date.now() < state.biddingDeadlineAt) throw new Error("Bidding deadline has not passed");

    const player = await ctx.db.get(state.currentPlayerId);
    if (!player) throw new Error("Current player not found");

    const winningBid = state.currentBidderId && state.currentBid
      ? await ctx.db.get(state.currentBidderId)
      : null;
    const now = Date.now();

    if (winningBid && state.currentBid) {
      if (state.currentBid > winningBid.remainingPoints) throw new Error("Winner no longer has enough points");
      await ctx.db.patch(winningBid._id, { remainingPoints: winningBid.remainingPoints - state.currentBid, updatedAt: now });
      await ctx.db.patch(player._id, {
        status: "sold", ambassadorId: winningBid._id,
        soldPrice: state.currentBid, soldAt: now, updatedAt: now,
      });
      await ctx.db.insert("auctionResults", {
        playerId: player._id, ambassadorId: winningBid._id,
        winningBid: state.currentBid, status: "sold", soldAt: now, createdAt: now,
      });
      await ctx.db.insert("auctionEvents", {
        eventType: "PLAYER_SOLD", message: "Player sold",
        playerId: player._id, ambassadorId: winningBid._id,
        amount: state.currentBid, actorUserId: user._id, createdAt: now,
      });
      await ctx.db.insert("notifications", {
        userId: winningBid.userId, title: "Player purchased",
        message: "Your team won the current player.", type: "auction",
        createdAt: now,
      });
      await ctx.db.patch(state._id, {
        currentPlayerId: null, currentBid: null, currentBidderId: null,
        biddingOpen: false, biddingDeadlineAt: null,
        biddingSecondsRemaining: null, updatedAt: now,
      });
      return { status: "sold" as const, playerId: player._id };
    }

    await ctx.db.patch(player._id, { status: "unsold", updatedAt: now });
    await ctx.db.insert("auctionResults", {
      playerId: player._id, ambassadorId: null, winningBid: null,
      status: "unsold", soldAt: now, createdAt: now,
    });
    await ctx.db.insert("auctionEvents", {
      eventType: "PLAYER_UNSOLD", message: "Player unsold",
      playerId: player._id, actorUserId: user._id, createdAt: now,
    });
    await ctx.db.patch(state._id, {
      currentPlayerId: null, currentBid: null, currentBidderId: null,
      biddingOpen: false, biddingDeadlineAt: null,
      biddingSecondsRemaining: null, updatedAt: now,
    });
    return { status: "unsold" as const, playerId: player._id };
  },
});


export const finalizeExpired = internalMutation({
  args: { stateId: v.id("auctionState") },
  handler: async (ctx, args) => {
    const state = await ctx.db.get(args.stateId);
    if (!state || !state.currentPlayerId || !state.biddingDeadlineAt) return null;
    if (!state.biddingOpen || Date.now() < state.biddingDeadlineAt) return null;

    const player = await ctx.db.get(state.currentPlayerId);
    if (!player) return null;
    const now = Date.now();
    const winner = state.currentBidderId && state.currentBid
      ? await ctx.db.get(state.currentBidderId)
      : null;

    if (winner && state.currentBid) {
      if (state.currentBid > winner.remainingPoints) {
        await ctx.db.patch(player._id, { status: "unsold", updatedAt: now });
        await ctx.db.insert("auctionResults", {
          playerId: player._id, ambassadorId: null, winningBid: null,
          status: "unsold", soldAt: now, createdAt: now,
        });
      } else {
        await ctx.db.patch(winner._id, {
          remainingPoints: winner.remainingPoints - state.currentBid, updatedAt: now,
        });
        await ctx.db.patch(player._id, {
          status: "sold", ambassadorId: winner._id,
          soldPrice: state.currentBid, soldAt: now, updatedAt: now,
        });
        await ctx.db.insert("auctionResults", {
          playerId: player._id, ambassadorId: winner._id,
          winningBid: state.currentBid, status: "sold", soldAt: now, createdAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: winner.userId, title: "Player purchased",
          message: "Your team won the current player.", type: "auction", createdAt: now,
        });
      }
    } else {
      await ctx.db.patch(player._id, { status: "unsold", updatedAt: now });
      await ctx.db.insert("auctionResults", {
        playerId: player._id, ambassadorId: null, winningBid: null,
        status: "unsold", soldAt: now, createdAt: now,
      });
    }

    await ctx.db.patch(state._id, {
      currentPlayerId: null, currentBid: null, currentBidderId: null,
      biddingOpen: false, biddingDeadlineAt: null,
      biddingSecondsRemaining: null, updatedAt: now,
    });
    return null;
  },
});
