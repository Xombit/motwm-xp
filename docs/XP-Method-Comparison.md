# XP Award Method Comparison

This module supports two different XP award methods from D&D editions 3.0 and 3.5. Both methods are fully featured with decimal CR adjustment support and epic level progression. Choose the one that best fits your campaign style.

---

## D&D 3.5e Per-Monster Method **[DEFAULT]**

**Setting Name:** "D&D 3.5e (Individual XP)"  
**Mode ID:** `dmg35`  
**Source:** D20 SRD

### How It Works

This method awards XP individually based on how challenging each monster is for each PC:

1. For each monster defeated, look up its base XP value using the monster's CR and each PC's level
2. Divide that monster's XP by the number of PCs earning XP
3. Sum all monster contributions to get each PC's total award

**Key Principle:** The same monster awards different XP to different PCs based on their individual levels. Higher-level PCs find lower-CR monsters less challenging and receive proportionally less XP.

### Example (from DMG p.38)

Party of 5 PCs (levels 3, 4, 4, 4, 5) defeats 2 CR 2 monsters and 1 CR 3 monster:

| PC Level | Monster 1 (CR 2) | Monster 2 (CR 2) | Monster 3 (CR 3) | Total Award |
|----------|------------------|------------------|------------------|-------------|
| Level 3  | 600 ÷ 5 = 120    | 600 ÷ 5 = 120    | 900 ÷ 5 = 180    | **420 XP**  |
| Level 4  | 600 ÷ 5 = 120    | 600 ÷ 5 = 120    | 800 ÷ 5 = 160    | **400 XP**  |
| Level 5  | 500 ÷ 5 = 100    | 500 ÷ 5 = 100    | 750 ÷ 5 = 150    | **350 XP**  |

Notice how the level 3 PC receives **420 XP** while the level 5 PC receives **350 XP** from the same encounter—the higher-level character faces less challenge.

### Features

✅ **Official RAW:** Exact implementation of DMG 3.5e rules  
✅ **Individual scaling:** Each PC's award reflects their personal challenge level  
✅ **Epic progression:** Full support for levels 1-40 and CR 1-40  
✅ **Decimal adjustments:** EL modifier +1.5 interpolates smoothly between +1 and +2 XP  
✅ **Mixed-level parties:** Naturally balances XP distribution across level gaps

### When to Use

- **D&D 3.5e campaigns** following official Dungeon Master's Guide rules
- **Mixed-level parties** where you want higher-level PCs to receive less from easier fights
- **Epic campaigns** using levels 21-40
- **Precise difficulty tuning** with decimal EL modifiers for encounter adjustments

---

## D&D 3.0 Split-Pot Method

**Setting Name:** "D&D 3.0 (split pot by APL)"  
**Mode ID:** `split30`  
**Source:** D&D 3.0 Dungeon Master's Guide, Table 7-1

### How It Works

This method calculates a total XP pot for the entire encounter and divides it equally:

1. Calculate the party's Average Party Level (APL)
2. Determine the encounter's Encounter Level (EL) based on monster CRs
3. Look up the total XP pot from the 3.0 table (APL vs EL)
4. Divide the pot equally among all PCs earning XP

**Key Principle:** All PCs receive the same XP regardless of their individual levels. The challenge is assessed for the party as a whole, not individually.

### Example

Party of 2 PCs (levels 15 and 20) defeats an EL 19 encounter:

1. **APL Calculation:** (15 + 20) ÷ 2 = 17.5 → rounds to **18**
2. **XP Pot Lookup:** APL 18 vs EL 19 = **14,400 XP** total
3. **Distribution:** 14,400 ÷ 2 = **7,200 XP** per PC

Both the level 15 and level 20 characters receive exactly **7,200 XP** from this encounter.

### Features

✅ **Equal distribution:** All party members receive identical XP awards  
✅ **Simpler math:** One lookup per encounter instead of per-monster-per-PC  
✅ **Party-focused:** Assesses challenge for the group as a whole  
✅ **Decimal adjustments:** EL modifier +1.5 interpolates smoothly between +1 and +2 XP  
✅ **3.0 nostalgia:** Perfect for groups using older D&D 3.0 rules

### When to Use

- **D&D 3.0 campaigns** or groups preferring the older edition's approach
- **Equal rewards philosophy:** When you want all party members advancing at the same rate
- **Simpler bookkeeping:** Faster XP calculation with less individual tracking
- **Group cohesion:** When party unity is prioritized over individual challenge

---

## Side-by-Side Comparison

| Feature | D&D 3.5e (dmg35) | D&D 3.0 (split30) |
|---------|------------------|-------------------|
| **XP Distribution** | Individual (varies by PC level) | Equal (same for all PCs) |
| **Calculation Basis** | Per-monster vs each PC | Total pot vs party average |
| **Mixed-level Parties** | Higher-level PCs get less XP | All PCs get same XP |
| **Computation** | More complex (monster × PC matrix) | Simpler (one lookup) |
| **Official Source** | DMG 3.5e Table 2-6 (p.38) | DMG 3.0 Table 7-1 |
| **Level Range** | 1-40 (with epic support) | 1-40 (extended from original) |
| **CR Range** | 1-40 | 1-40 |
| **Decimal EL Modifiers** | ✅ Linear interpolation | ✅ Linear interpolation |
| **EL Combination** | DMG p.49 rules (same=+2, diff 1-7=+1) | Same |
| **Best For** | RAW 3.5e, mixed levels | 3.0 edition, equal progression |

---

## Common Questions

### Can I switch between methods mid-campaign?

Yes, but this may cause XP distribution to shift dramatically. The 3.5e method gives less XP to higher-level PCs, while 3.0 gives everyone equal shares. Consider the impact on party balance before switching.

### Do both methods use the EL modifier?

Yes! Both methods support the EL modifier field with **decimal interpolation**. An adjustment of +1.5 will smoothly interpolate XP values between +1 and +2 for both methods.

### Which method levels parties faster?

It depends on party composition:
- **Even-level parties:** Both methods give similar total XP
- **Mixed-level parties (3.5e):** Lower-level PCs advance faster, higher-level PCs slower
- **Mixed-level parties (3.0):** All PCs advance at the same rate regardless of level

### Does the EL calculation differ between methods?

No. Both methods use the same Encounter Level calculation based on DMG 3.5e combination rules (p.49):
- Same CR = +2 EL
- 1-7 levels below = +1 EL  
- 8+ levels below = +0 EL (negligible)

---

## Recommendation

**Use D&D 3.5e (dmg35)** if:
- You're running a D&D 3.5e campaign
- You want official RAW behavior
- Your party has mixed levels and you want natural leveling balance
- You prefer individual challenge assessment

**Use D&D 3.0 (split30)** if:
- You're running a D&D 3.0 campaign or prefer its philosophy
- You want everyone to receive equal XP
- You value simpler calculations
- Your party prefers advancing together at the same pace

**To change methods:** Open Foundry settings → Module Settings → "motwm-xp" → "XP Award Method"
