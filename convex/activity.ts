import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Call this whenever a user clicks/views a file
export const touchItem = mutation({
  args: { 
    itemId: v.id("driveItems") 
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError({message:'Unauthorized',code:403})

    const item = await ctx.db.get(args.itemId);

    // 1. Check existence and ownership
    if (!item || item.userId !== user._id) {
      // We don't throw an error here to prevent UI flicker if 
      // someone clicks a public link they don't own. 
      // We only track "Recents" for the owner.
      return;
    }

    // 2. Update the lastOpened timestamp
    await ctx.db.patch(args.itemId, {
      lastOpened: Date.now(),
    });
  },
});