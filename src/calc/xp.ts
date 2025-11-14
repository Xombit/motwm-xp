/** ===== D35E progression helpers (single source of truth) ===== */

export function systemTotalXPForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  const rate = game.settings.get("D35E", "experienceRate") as string; // "fast" | "medium" | "slow" (or others)
  const table = (CONFIG as any)?.D35E?.CHARACTER_EXP_LEVELS?.[rate];
  if (Array.isArray(table)) {
    return Number(table[Math.min(L - 1, table.length - 1)] ?? 0);
  }
  // ultra-safe fallback: 3.5e classic quadratic
  return Math.floor(1000 * ((L - 1) * L) / 2);
}

/** Total number of bubble segments in the XP bar UI */
export const TOTAL_BUBBLE_SEGMENTS = 13 + 1/3;

/** ===== Award methods (we'll wire exact tables shortly) ===== */

/** 
 * RAW 3.5e per-PC award: PC Level vs Encounter Level
 * Based on the official d20srd.org encounter calculator
 * (https://www.d20srd.org/extras/d20encountercalculator/)
 * 
 * This matches the community-standard calculator which uses the DMG formulas
 * with special case adjustments for specific level/EL combinations.
 * 
 * Key rules:
 * - Encounters 8+ levels below party: 0 XP (too trivial)
 * - Encounters 8+ levels above party: 0 XP (too dangerous)
 * - Low level PCs (1-3) have special handling
 * - Specific adjustments for even/odd ELs at certain PC levels
 */
export function awardRaw35(pcLevel: number, encounterLevel: number): number {
  let x = pcLevel;
  let y = encounterLevel;
  
  // Invalid inputs
  if (x <= 0 || y <= 0) return 0;
  
  let iReturn = 0;
  
  // Clamp low-level PCs to level 3 for calculation purposes
  if (x < 3) x = 3;
  
  // Special case for very low level encounters (including fractional CRs)
  // For fractional CRs (0.125, 0.25, 0.33, 0.5), use proportional XP
  if ((x <= 6) && (y <= 1)) {
    iReturn = 300 * y;
  } else if (y < 1) {
    // Fractional EL for higher-level PCs: scale from base 300
    iReturn = 300 * y;
  } else {
    // General formula for 3.5 (attempts to follow DMG pattern)
    // This is a best-fit formula that gets corrected by special cases below
    const mEven = (val: number): number => {
      let result = 2 * Math.floor(val / 2);
      if (val < result) result += -2;
      else if (val > result) result += 2;
      return result;
    };
    
    iReturn = 6.25 * x * Math.pow(2, mEven(7 - (x - y)) / 2) * (11 - (x - y) - mEven(7 - (x - y)));
  }
  
  // Special corrections for even ELs (4, 6, 8, 10, 12, 14, 16, 18, 20)
  // These override the general formula for specific PC level ranges
  if ([4, 6, 8, 10, 12, 14, 16, 18, 20].includes(y)) {
    if (x <= 3) {
      iReturn = 1350 * Math.pow(2, (y - 4) / 2);
    } else if (x === 5 && y >= 6) {
      iReturn = 2250 * Math.pow(2, (y - 6) / 2);
    } else if (x === 7 && y >= 8) {
      iReturn = 3150 * Math.pow(2, (y - 8) / 2);
    } else if (x === 9 && y >= 10) {
      iReturn = 4050 * Math.pow(2, (y - 10) / 2);
    } else if (x === 11 && y >= 12) {
      iReturn = 4950 * Math.pow(2, (y - 12) / 2);
    } else if (x === 13 && y >= 14) {
      iReturn = 5850 * Math.pow(2, (y - 14) / 2);
    } else if (x === 15 && y >= 16) {
      iReturn = 6750 * Math.pow(2, (y - 16) / 2);
    } else if (x === 17 && y >= 18) {
      iReturn = 7650 * Math.pow(2, (y - 18) / 2);
    } else if (x === 19 && y >= 20) {
      iReturn = 8550 * Math.pow(2, (y - 20) / 2);
    }
  }
  
  // Special corrections for odd ELs (7, 9, 11, 13, 15, 17, 19)
  // These also override the general formula for specific PC level ranges
  if ([7, 9, 11, 13, 15, 17, 19].includes(y)) {
    if (x === 6) {
      iReturn = 2700 * Math.pow(2, (y - 7) / 2);
    }
    if (x === 8 && y >= 9) {
      iReturn = 3600 * Math.pow(2, (y - 9) / 2);
    }
    if (x === 10 && y >= 11) {
      iReturn = 4500 * Math.pow(2, (y - 11) / 2);
    }
    if (x === 12 && y >= 13) {
      iReturn = 5400 * Math.pow(2, (y - 13) / 2);
    }
    if (x === 14 && y >= 15) {
      iReturn = 6300 * Math.pow(2, (y - 15) / 2);
    }
    if (x === 16 && y >= 17) {
      iReturn = 7200 * Math.pow(2, (y - 17) / 2);
    }
    if (x === 18 && y >= 19) {
      iReturn = 8100 * Math.pow(2, (y - 19) / 2);
    }
  }
  
  // Recursively handle very high ELs (above 20)
  if (y > 20) {
    iReturn = 2 * awardRaw35(x, y - 2);
  }
  
  // Final bounds checks: no XP for encounters too far from party level
  // More than 7 levels below: too trivial
  if (x - y > 7) iReturn = 0;
  // More than 7 levels above: too dangerous (party likely TPK'd)
  else if (y - x > 7) iReturn = 0;
  
  return Math.round(iReturn);
}

/** 
 * D&D 3.0 XP Table: Returns the total party XP pot for a given APL and CR
 */
export function getPot30(apl: number, cr: number): number {
  const TABLE_30: Record<number, Record<number, number>> = {
    1:  { 1:300, 2:600, 3:900, 4:1350, 5:1800, 6:2700, 7:3600, 8:5400, 9:7200, 10:10800 },
    2:  { 1:300, 2:600, 3:900, 4:1350, 5:1800, 6:2700, 7:3600, 8:5400, 9:7200, 10:10800 },
    3:  { 1:300, 2:600, 3:900, 4:1350, 5:1800, 6:2700, 7:3600, 8:5400, 9:7200, 10:10800 },
    4:  { 1:300, 2:600, 3:800, 4:1200, 5:1600, 6:2400, 7:3200, 8:4800, 9:6400, 10:9600, 11:12800, 12:18000, 13:21600, 14:28800 },
    5:  { 1:300, 2:500, 3:750, 4:1000, 5:1500, 6:2250, 7:3000, 8:4500, 9:6000, 10:9000, 11:12000, 12:18000, 13:21600, 14:28800, 15:28800 },
    6:  { 1:300, 2:450, 3:600, 4:900, 5:1200, 6:1800, 7:2400, 8:3600, 9:4800, 10:7200, 11:10800, 12:14400, 13:21600, 14:25200, 15:28800, 16:28800 },
    7:  { 1:263, 2:394, 3:525, 4:700, 5:1050, 6:1400, 7:2100, 8:3150, 9:4200, 10:6300, 11:8400, 12:12600, 13:16800, 14:25200, 15:28800 },
    8:  { 1:200, 2:300, 3:450, 4:600, 5:875, 6:1200, 7:1600, 8:2400, 9:3600, 10:4800, 11:6300, 12:8400, 13:12600, 14:16800, 15:25200, 16:28800 },
    9:  { 1:0, 2:225, 3:338, 4:506, 5:675, 6:1013, 7:1350, 8:2025, 9:2700, 10:4050, 11:5400, 12:8100, 13:10800, 14:16200, 15:21600, 16:32400, 17:36000, 18:39600 },
    10: { 3:250, 4:375, 5:563, 6:750, 7:1000, 8:1500, 9:2000, 10:3000, 11:3600, 12:4800, 13:6400, 14:9600 },
    11: { 4:275, 5:413, 6:619, 7:825, 8:1238, 9:1650, 10:2475, 11:3300, 12:4950, 13:6600, 14:9900, 15:13200, 16:17600, 17:26400, 18:39600 },
    12: { 5:300, 6:450, 7:675, 8:900, 9:1350, 10:1800, 11:1950, 12:2600, 13:3900, 14:5850, 15:7800, 16:11700, 17:15600, 18:23400, 19:31200, 20:46800 },
    13: { 6:325, 7:488, 8:731, 9:975, 10:1463, 11:1400, 12:2100, 13:2800, 14:4200, 15:6300, 16:8400, 17:12600, 18:18900, 19:25200, 20:33600 },
    14: { 6:350, 7:525, 8:788, 9:1050, 10:1575, 11:900, 12:1200, 13:1800, 14:2400, 15:4200, 16:4800, 17:7200, 18:10800, 19:13500, 20:18900 },
    15: { 7:375, 8:563, 9:844, 10:1125, 11:638, 12:850, 13:1275, 14:1900, 15:2500, 16:4800, 17:7200, 18:10800, 19:13500, 20:18900 },
    16: { 7:400, 8:600, 9:900, 10:1350, 11:900, 12:1200, 13:1800, 14:2400, 15:3200, 16:4800, 17:7200, 18:10800, 19:14400, 20:19200 },
    17: { 8:425, 9:638, 10:956, 11:900, 12:1200, 13:1800, 14:2400, 15:3200, 16:4800, 17:7200, 18:10800, 19:14400, 20:19200 },
    18: { 8:450, 9:675, 10:1013, 11:638, 12:850, 13:1275, 14:1900, 15:2500, 16:4800, 17:7200, 18:10800, 19:14400, 20:19200 },
    19: { 9:475, 10:713, 11:638, 12:850, 13:1275, 14:1900, 15:2500, 16:4800, 17:7200, 18:10800, 19:14400, 20:19200 },
    20: { 10:750, 11:900, 12:1200, 13:1800, 14:2400, 15:3200, 16:4800, 17:7200, 18:10800, 19:14400, 20:19200 },
    21: { 11:1125, 12:1350, 13:1800, 14:2700, 15:3600, 16:4800, 17:7200, 18:10800, 19:14400, 20:21600, 21:28800, 22:43200, 23:57600, 24:76800 },
    22: { 12:1688, 13:2025, 14:2700, 15:4050, 16:5400, 17:7200, 18:10800, 19:16200, 20:21600, 21:32400, 22:43200, 23:64800, 24:86400, 25:115200 },
    23: { 13:2250, 14:2700, 15:3600, 16:5400, 17:7200, 18:9600, 19:14400, 20:21600, 21:28800, 22:43200, 23:57600, 24:86400, 25:115200, 26:153600 },
    24: { 14:3000, 15:3600, 16:4800, 17:7200, 18:9600, 19:12800, 20:19200, 21:28800, 22:38400, 23:57600, 24:76800, 25:115200, 26:153600, 27:204800 },
    25: { 15:4500, 16:5400, 17:7200, 18:10800, 19:14400, 20:19200, 21:28800, 22:43200, 23:57600, 24:86400, 25:115200, 26:172800, 27:230400, 28:307200 },
    26: { 16:6750, 17:8100, 18:10800, 19:16200, 20:21600, 21:28800, 22:43200, 23:64800, 24:86400, 25:129600, 26:172800, 27:259200, 28:345600, 29:460800 },
    27: { 17:9000, 18:10800, 19:14400, 20:21600, 21:28800, 22:38400, 23:57600, 24:86400, 25:115200, 26:172800, 27:230400, 28:345600, 29:460800, 30:614400 },
    28: { 18:12000, 19:14400, 20:19200, 21:28800, 22:38400, 23:51200, 24:76800, 25:115200, 26:153600, 27:230400, 28:307200, 29:460800, 30:614400, 31:819200 },
    29: { 19:18000, 20:21600, 21:28800, 22:43200, 23:57600, 24:76800, 25:115200, 26:172800, 27:230400, 28:345600, 29:460800, 30:691200, 31:921600, 32:1228800 },
    30: { 20:27000, 21:32400, 22:43200, 23:64800, 24:86400, 25:115200, 26:172800, 27:259200, 28:345600, 29:518400, 30:691200, 31:1036800, 32:1382400, 33:1843200 },
    31: { 21:36000, 22:43200, 23:57600, 24:86400, 25:115200, 26:153600, 27:230400, 28:345600, 29:460800, 30:691200, 31:921600, 32:1382400, 33:1843200, 34:2457600 },
    32: { 22:48000, 23:57600, 24:76800, 25:115200, 26:153600, 27:204800, 28:307200, 29:460800, 30:614400, 31:921600, 32:1228800, 33:1843200, 34:2457600, 35:3276800 },
    33: { 23:72000, 24:86400, 25:115200, 26:172800, 27:230400, 28:307200, 29:460800, 30:691200, 31:921600, 32:1382400, 33:1843200, 34:2764800, 35:3686400, 36:4915200 },
    34: { 24:108000, 25:129600, 26:172800, 27:259200, 28:345600, 29:460800, 30:691200, 31:1036800, 32:1382400, 33:2073600, 34:2764800, 35:4147200, 36:5529600, 37:7372800 },
    35: { 25:144000, 26:172800, 27:230400, 28:345600, 29:460800, 30:614400, 31:921600, 32:1382400, 33:1843200, 34:2764800, 35:3686400, 36:5529600, 37:7372800, 38:9830400 },
    36: { 26:192000, 27:230400, 28:307200, 29:460800, 30:614400, 31:819200, 32:1228800, 33:1843200, 34:2457600, 35:3686400, 36:4915200, 37:7372800, 38:9830400, 39:13107200 },
    37: { 27:288000, 28:345600, 29:460800, 30:691200, 31:921600, 32:1228800, 33:1843200, 34:2764800, 35:3686400, 36:5529600, 37:7372800, 38:11059200, 39:14745600, 40:19660800 },
    38: { 28:432000, 29:518400, 30:691200, 31:1036800, 32:1382400, 33:1843200, 34:2764800, 35:4147200, 36:5529600, 37:8294400, 38:11059200, 39:16588800, 40:22118400 },
    39: { 29:576000, 30:691200, 31:921600, 32:1382400, 33:1843200, 34:2457600, 35:3686400, 36:5529600, 37:7372800, 38:11059200, 39:14745600, 40:22118400 },
    40: { 30:768000, 31:921600, 32:1228800, 33:1843200, 34:2457600, 35:3276800, 36:4915200, 37:7372800, 38:9830400, 39:14745600, 40:19660800 }
  };

  const aplInt = Math.max(1, Math.min(40, Math.floor(apl)));
  const crInt = Math.max(1, Math.floor(cr));
  
  // Look up the value in the table
  const levelRow = TABLE_30[aplInt];
  if (!levelRow) return 0;
  
  const xp = levelRow[crInt];
  if (xp !== undefined) return xp;
  
  // If CR not in table, use the baseline for that APL and apply the standard scaling
  const baseXP = getBasePot30(aplInt);
  const diff = crInt - aplInt;
  
  // Apply the alternating ×3/2, ×4/3 pattern for higher CRs
  // Or ×2/3, ×3/4 pattern for lower CRs
  let result = baseXP;
  if (diff > 0) {
    // Higher CR: alternating ×3/2 and ×4/3
    for (let step = 0; step < diff; step++) {
      result = Math.floor(result * (step % 2 === 0 ? 3/2 : 4/3));
    }
  } else if (diff < 0) {
    // Lower CR: alternating ×2/3 and ×3/4
    for (let step = 0; step < Math.abs(diff); step++) {
      result = Math.floor(result * (step % 2 === 0 ? 2/3 : 3/4));
    }
  }
  
  return Math.max(0, result);
}

/** Helper: Get the baseline XP for a party level when CR = APL */
function getBasePot30(apl: number): number {
  // Levels 1-11: simple 300 × level
  if (apl <= 11) return 300 * apl;
  
  // Irregular levels 12-15 (from actual table)
  const irregular: Record<number, number> = { 12: 2600, 13: 2800, 14: 2400, 15: 2500 };
  if (irregular[apl]) return irregular[apl];
  
  // Levels 16+: use the geometric progression pattern
  // Starting from level 16 = 4800, apply ×1.5, ×1.5, ×4/3, ×4/3 pattern
  let xp = 4800;
  const pattern = [1.5, 1.5, 4/3, 4/3];
  for (let level = 17; level <= apl; level++) {
    const mult = pattern[(level - 17) % 4];
    xp = Math.floor(xp * mult);
  }
  return xp;
}

/** Classic 3.0 Split: pass a total pot (you compute from APL vs EL) and return each share (weighted elsewhere) */
export function split30(pot: number, weight: number, totalWeight: number): number {
  if (pot <= 0 || totalWeight <= 0) return 0;
  return Math.round((pot * weight) / totalWeight);
}
