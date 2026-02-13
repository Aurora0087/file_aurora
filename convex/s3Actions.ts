"use node"

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

export const getSignedThumbnails = action({
  args: {
    storageKeys: v.array(v.string()),
  },
  handler: async (_, args) => {
    // These would come from your Environment Variables
    const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY||"";
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID||"";
    const cloudFrontDomain = "https://d1g3r14w76z3go.cloudfront.net";

    const signedUrls = args.storageKeys.map((key) => {
      return getSignedUrl({
        url: `${cloudFrontDomain}/${key}`,
        keyPairId,
        privateKey,
        dateLessThan: new Date(Date.now() + 1000 * 60 * 60*2).toISOString(), // 2hour
      });
    });

    return signedUrls;
  },
});