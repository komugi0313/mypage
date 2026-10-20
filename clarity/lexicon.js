/* =============================================================================
   Numinous — Business Interpretation Lexicon  (the moat / founder's IP)
   -----------------------------------------------------------------------------
   This file translates Four Pillars (BaZi) concepts into the language of
   business decision-making. It is what stops the AI from producing "generic"
   readings: the model is given these grounded meanings instead of guessing.

   HOW TO EDIT (for the founder):
   - Every string is plain English shown to a US business audience.
   - Keep it non-mystical and decision-oriented. No "fortune telling" language.
   - Refine each entry to match YOUR school of 四柱推命 and YOUR reading voice.
   - This is a DRAFT for you to correct — the values, not the structure, are
     where your expertise goes.
   ============================================================================= */

// ---- 1. Day Master (日主) — the 10 core operating types ----------------------
// title: a memorable business archetype
// drive / strength / blindspot / energized / drained / decision
const DAYMASTER = {
  "甲": { label:"Yang Wood 甲", title:"The Pioneer",
    drive:"to grow something upright and lasting, on your own terms",
    strength:"vision, principle, and the will to push a plan forward",
    blindspot:"rigidity — you can keep pushing a direction long after it stops working",
    energized:"new ground, ambitious goals, being the one who starts things",
    drained:"petty politics, being boxed into someone else's structure",
    decision:"you decide from principle and long-term direction; guard against deciding purely to avoid backing down" },
  "乙": { label:"Yin Wood 乙", title:"The Navigator",
    drive:"to keep growing by adapting — around obstacles, not through them",
    strength:"flexibility, relationships, and quiet persistence",
    blindspot:"over-accommodation — you can bend so much you lose your own line",
    energized:"collaboration, finding the workable path, being needed",
    drained:"blunt-force conflict, rigid ultimatums, isolation",
    decision:"you decide by reading people and context; guard against deferring your own call to keep the peace" },
  "丙": { label:"Yang Fire 丙", title:"The Beacon",
    drive:"to be seen, to energize, to make things visible and alive",
    strength:"charisma, momentum, and the ability to rally people",
    blindspot:"overextension — you burn hot and can commit past your capacity",
    energized:"visibility, big launches, an audience, fast tempo",
    drained:"obscurity, slow grinding detail, working alone in the dark",
    decision:"you decide with bold optimism; guard against deciding for the spotlight rather than the substance" },
  "丁": { label:"Yin Fire 丁", title:"The Focused Flame",
    drive:"to illuminate what matters, precisely, for the people close to you",
    strength:"insight, warmth, and one-to-one influence",
    blindspot:"sensitivity — outside noise and criticism can knock you off center",
    energized:"deep focus, meaningful work, trusted relationships",
    drained:"chaos, large impersonal crowds, constant context-switching",
    decision:"you decide by careful, intuitive read; guard against overreacting to a single loud opinion" },
  "戊": { label:"Yang Earth 戊", title:"The Mountain",
    drive:"to hold the center and provide something solid others can rely on",
    strength:"stability, dependability, and staying power under pressure",
    blindspot:"stubbornness — you can resist change until it is forced on you",
    energized:"being trusted, building durable things, being the anchor",
    drained:"constant pivots, instability, being rushed",
    decision:"you decide slowly and firmly; guard against confusing 'immovable' with 'right'" },
  "己": { label:"Yin Earth 己", title:"The Cultivator",
    drive:"to nurture and organize — to make things grow through patient care",
    strength:"supportiveness, attention to detail, and quiet reliability",
    blindspot:"over-absorption — you can take on everyone's problems as your own",
    energized:"helping people and systems flourish, steady incremental progress",
    drained:"selfish environments, being taken for granted, sudden upheaval",
    decision:"you decide with care for everyone affected; guard against self-sacrifice that quietly drains you" },
  "庚": { label:"Yang Metal 庚", title:"The Executor",
    drive:"to act decisively and get the hard thing done",
    strength:"directness, courage, and the ability to cut through",
    blindspot:"bluntness — you can force a result and break relationships doing it",
    energized:"clear targets, decisive action, real challenges",
    drained:"ambiguity, endless deliberation, hand-holding",
    decision:"you decide fast and act; guard against cutting before you have fully understood" },
  "辛": { label:"Yin Metal 辛", title:"The Specialist",
    drive:"to refine toward excellence — quality over quantity",
    strength:"discernment, taste, and precision",
    blindspot:"perfectionism — you can stall or self-criticize past the point of value",
    energized:"craftsmanship, high standards, being recognized for quality",
    drained:"sloppiness, mass-market compromise, harsh public exposure",
    decision:"you decide by standard and detail; guard against polishing what you should be shipping" },
  "壬": { label:"Yang Water 壬", title:"The Strategist",
    drive:"to move wide and far — to see the whole board and flow toward opportunity",
    strength:"big-picture strategy, adaptability, and range",
    blindspot:"scatter — you can start many things and finish few",
    energized:"open horizons, new markets, movement and possibility",
    drained:"narrow routine, rigid confinement, forced stillness",
    decision:"you decide from the wide view; guard against chasing the next option before landing this one" },
  "癸": { label:"Yin Water 癸", title:"The Reader",
    drive:"to perceive the undercurrents others miss and advise from insight",
    strength:"perception, intuition, and depth of understanding",
    blindspot:"overthinking — you can analyze yourself out of a decision",
    energized:"deep problems, quiet study, being the trusted mind in the room",
    drained:"noise, forced exposure, pressure to decide before you have thought",
    decision:"you decide from deep read; guard against waiting for certainty that will never fully arrive" }
};

// ---- 2. Self strength (身強 / 身弱) ------------------------------------------
const STRENGTH = {
  strong: { label:"Strong (身強)",
    meaning:"self-sufficient — you can carry load, act independently, and push your own agenda",
    edge:"your growth edge is yielding: delegating, letting allies in, and knowing when NOT to force",
    decision:"you can afford bold, self-driven moves — but a strong self in a demanding season should still choose where to spend, not spend everywhere" },
  weak: { label:"Weak (身弱)",
    meaning:"you are most effective with support, structure, and allies around you",
    edge:"your growth edge is not carrying everything alone and not overcommitting your limited reserves",
    decision:"favor moves that add support and reduce load; be wary of big solo bets that assume energy you may not have" },
  balanced: { label:"Balanced (中和)",
    meaning:"your chart sits near equilibrium — neither dominated by self nor overwhelmed by it, so you can flex between leading and yielding",
    edge:"your growth edge is reading each situation on its own terms rather than defaulting to one mode",
    decision:"you have unusual range — match your posture to the moment; the risk is drifting without a clear stance" }
};

// ---- 3. Favorable element (用神) — what to lean into --------------------------
// Used as: "your favorable element is X" → tilt advice/timing toward X's themes.
const ELEMENTS = {
  Wood:  { themes:"growth, initiative, new ventures, expansion",
           leanInto:"starting, building, planting for the future, taking initiative",
           avoid:"stagnation and clinging to what has stopped growing" },
  Fire:  { themes:"visibility, energy, reputation, relationships",
           leanInto:"being seen, marketing, networking, raising your profile",
           avoid:"hiding, isolation, and letting momentum go cold" },
  Earth: { themes:"stability, trust, systems, consolidation",
           leanInto:"building foundations, reliability, process, deepening trust",
           avoid:"reckless change and overextension beyond a stable base" },
  Metal: { themes:"structure, decisions, discipline, pruning",
           leanInto:"deciding, cutting what does not serve, focus, quality standards",
           avoid:"indecision, keeping too many things half-alive" },
  Water: { themes:"strategy, flexibility, learning, movement",
           leanInto:"strategy, patience, learning, staying fluid and adaptable",
           avoid:"forcing, rigidity, and acting before you understand the terrain" }
};

// ---- 4. Ten Gods (十神) — the 10 relational drives ---------------------------
// label / biz (what it is in business terms) / gift / watch
const TENGODS = {
  "比肩": { label:"比肩 Peer / Friend",
    biz:"independence and self-reliance — the founder who wants to run their own show",
    gift:"self-drive, resilience, standing on your own", watch:"resisting partnership, help, or authority you actually need",
    work:"founder, independent professional, own-brand business, anything where you answer to yourself" },
  "劫財": { label:"劫財 Rival / Rob-Wealth",
    biz:"competitive drive and networking energy — thrives in rivalry and hustle",
    gift:"boldness, resourcefulness, momentum through people", watch:"overspending, cash-flow risk, and rivalry that turns costly",
    work:"sales leadership, negotiation, trading, competitive markets, partnership-driven ventures" },
  "食神": { label:"食神 Output / Creator",
    biz:"steady creative production — building and making with enjoyment",
    gift:"product creativity, consistent output, likeability", watch:"comfort and drift when there is no external pressure",
    work:"creating products, food & hospitality, content and craft, R&D, work you can genuinely enjoy" },
  "傷官": { label:"傷官 Innovator / Disruptor",
    biz:"brilliant, unconventional talent — the disruptive voice and star maker",
    gift:"innovation, brand voice, standout thinking", watch:"friction with rules, authority, and 'the way it's done'",
    work:"innovation, design, engineering artistry, media, strategy — anywhere the standard way isn't good enough" },
  "偏財": { label:"偏財 Opportunist / Dealmaker",
    biz:"flexible, opportunistic money — deals, sales, wide networks, upside",
    gift:"dealmaking, sales instinct, spotting windfalls", watch:"spreading too thin and chasing every opportunity",
    work:"dealmaking, business development, marketing, investing, ventures with wide networks and upside" },
  "正財": { label:"正財 Builder of Wealth",
    biz:"steady, disciplined income — sustainable revenue built incrementally",
    gift:"reliability, budgeting, durable client relationships", watch:"playing so safe you miss real upside",
    work:"finance, operations, asset management, long-term client businesses — compounding, steady enterprises" },
  "偏官": { label:"偏官 / 七殺 Commander",
    biz:"power under pressure — bold, decisive leadership in crisis and high stakes",
    gift:"decisiveness, execution under fire, bold bets", watch:"burnout, making enemies, and pressure you don't offload",
    work:"turnarounds, crisis leadership, operations under pressure, security, high-stakes execution" },
  "正官": { label:"正官 Officer / Steward",
    biz:"status, order, and responsibility — structured leadership and reputation",
    gift:"governance, credibility, dependable management", watch:"rigidity and over-caring about rank and appearances",
    work:"executive management, law, governance, public-facing leadership in established organizations" },
  "偏印": { label:"偏印 Specialist Mind",
    biz:"unconventional knowledge and intuition — niche expertise and R&D",
    gift:"specialized insight, original thinking, perception", watch:"aloofness and analysis-paralysis",
    work:"research, niche expertise, strategy, planning, healing and alternative fields — depth over breadth" },
  "正印": { label:"印綬 Mentor / Foundation",
    biz:"learning, support, and credibility — the knowledge base and safety net",
    gift:"wisdom, mentorship, protection, earned trust", watch:"leaning on comfort and support instead of acting",
    work:"teaching, advising, scholarship, credentialed professions, mentorship — trust built on knowledge" }
};

// ---- 5. Season (大運 × 流年) — the current chapter ---------------------------
const SEASON = {
  support:     { label:"Supportive season",   meaning:"your favorable element is active — conditions are working with you",
                 posture:"a season to plant and commit, not to hesitate" },
  peak:        { label:"Peak season",         meaning:"strong momentum and visibility",
                 posture:"good for bold moves — but watch overreach and protect your reserves" },
  consolidate: { label:"Consolidation season",meaning:"an inward phase",
                 posture:"better for building foundations, systems and skills than for launching loudly" },
  friction:    { label:"Friction season",     meaning:"resistance and drain are high",
                 posture:"a season for caution, conserving energy, and avoiding unnecessary fights" },
  transition:  { label:"Transition season",   meaning:"you are between cycles and clarity is lower than usual",
                 posture:"small reversible steps beat big irreversible ones" }
};

// Export for both plain <script> (globals) and module contexts.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DAYMASTER, STRENGTH, ELEMENTS, TENGODS, SEASON };
}
