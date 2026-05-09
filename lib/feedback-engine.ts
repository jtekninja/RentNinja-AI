import { dbConnect } from "@/lib/mongodb";
import ApplicantAction from "@/models/ApplicantAction";
import type { Types } from "mongoose";

/**
 * Computes historical accuracy per action-type for an organization.
 * Accuracy = (# of positive outcomes) / (# of resolutions with outcome data)
 * Returns a map of actionType -> historicalAccuracy (0-100).
 */
export async function computeHistoricalAccuracy(
  organizationId: string | Types.ObjectId,
): Promise<Record<string, number>> {
  await dbConnect();

  const pipeline = [
    {
      $match: {
        organizationId,
        status: { $in: ["accepted", "skipped", "overridden", "auto_applied"] },
        outcome: { $in: ["positive", "negative", "neutral"] },
      },
    },
    {
      $group: {
        _id: "$actionType",
        total: { $sum: 1 },
        positive: {
          $sum: {
            $cond: [{ $eq: ["$outcome", "positive"] }, 1, 0],
          },
        },
        neutral: {
          $sum: {
            $cond: [{ $eq: ["$outcome", "neutral"] }, 1, 0],
          },
        },
        negative: {
          $sum: {
            $cond: [{ $eq: ["$outcome", "negative"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        actionType: "$_id",
        // Weighted: positive=1.0, neutral=0.5, negative=0.0
        accuracy: {
          $multiply: [
            {
              $cond: [
                { $gt: ["$total", 0] },
                {
                  $divide: [
                    {
                      $add: ["$positive", { $multiply: ["$neutral", 0.5] }],
                    },
                    "$total",
                  ],
                },
                0,
              ],
            },
            100,
          ],
        },
      },
    },
  ];

  const results = await ApplicantAction.aggregate(pipeline);

  const accuracyMap: Record<string, number> = {};
  for (const row of results) {
    if (row.actionType && row.accuracy !== undefined) {
      accuracyMap[row.actionType] = Math.round(row.accuracy);
    }
  }

  return accuracyMap;
}

/**
 * Lightweight version: compute accuracy for a single action type.
 * Used for per-action-type lookup during generation.
 */
export function getAccuracyForActionType(
  accuracyMap: Record<string, number>,
  actionType: string,
): number | null {
  const value = accuracyMap[actionType];
  return value !== undefined ? value : null;
}
