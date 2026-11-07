import type { Proposition } from "@storyteller/types/v2/proposition.ts";

/**
 * ガラスの靴はシンデレラにしか合わない
 * 第2章で読者に見せ、第4章の靴合わせはこれを前提に読まれる
 */
export const glassSlipperFit: Proposition = {
  id: "glass_slipper_fit",
  statement: "ガラスの靴はシンデレラにしか合わない",
  authorTruth: true,
  resolutionPolicy: "may-remain-withheld",
};
