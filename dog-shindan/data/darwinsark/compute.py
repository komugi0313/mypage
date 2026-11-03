#!/usr/bin/env python3
"""
Per-breed Darwin's Ark factor scores (Morrill et al. 2022, Science 376:eabk0639).

STATUS (2026-11-01): NOT YET RUN. The input zip could not be downloaded from this
cloud session (see "Getting the data" below). No numbers in this project come from
this script until it has been run on the real files.

Getting the data
----------------
Dryad dataset doi:10.5061/dryad.g4f4qrfr0 (version 11, published 2022-05-05, CC0-1.0)
  page : https://datadryad.org/dataset/doi:10.5061/dryad.g4f4qrfr0
  files: DarwinsArk.zip (44.7 MB)   <- needed
         ReferenceData.zip (15.6 KB) <- needed (ReferenceData_breeds.csv)
         README.md (12.8 KB)         <- documentation
         GeneticData.zip (6.96 GB), MendelsMutts.zip, MuttMix.zip <- NOT needed
Download those two zips in a normal browser and put them (zipped or unzipped) in
  dog-shindan/data/darwinsark/raw/
then run:
  python3 -I dog-shindan/data/darwinsark/compute.py

Method (mirrors the authors' own code, github.com/DarwinsArk/muttomics)
-----------------------------------------------------------------------
* Factor scores: DarwinsArk_20191115_factor_scores.csv, long format
  (dog, factor, score.norm, age, ...). We use the authors' published score.norm
  for factors 1-8 as-is; nothing is re-derived.
* Factor names / meanings: DarwinsArk_20191115_factors.csv (factor, name,
  negative, positive, and per-question rows). top_questions = the questions
  listed for each factor in that file, ordered by |loading| if a loading column
  exists; question text from DarwinsArk_20191115_questions.csv.
* Purebred dogs: dogs.csv flags `cand` (candidate purebred = owner-reported
  purebred single breed) or `conf` (genetically confirmed). Breed label =
  confirmed breed (regseq_breed) when present, else owner_breed, as in
  muttomics/plot/plot_RR.R and dashboard/make_WEBDATA.R. "cocker spaniel",
  "american cocker spaniel", "english cocker spaniel" are merged into
  "cocker spaniel" exactly as the authors did ("usage by owners is confused").
  If `cand`/`conf` columns are absent the fallback is owner_breed present AND
  purebred == "yes" (this is reported in the output notes).
* Stats: mean and sample SD (ddof=1, same as R sd()) of score.norm per breed per
  factor; n = number of distinct dogs with a score for that factor (the breed's
  reported n is the max over factors). overall = all surveyed dogs with a score
  (purebred + mixed).
* Breeds with n < MIN_N (15) go to "missing".
"""
import csv, io, json, math, os, re, sys, zipfile
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "breed_factors.json")
MIN_N = 15

# our id -> candidate dataset names (lowercase; first one found in the data wins)
BREEDS = {
    "toypoodle": ["toy poodle", "poodle (toy)", "poodle"],
    "chihuahua": ["chihuahua"],
    "mdachs": ["miniature dachshund", "dachshund (miniature)", "dachshund"],
    "pome": ["pomeranian"],
    "yorkie": ["yorkshire terrier"],
    "schnauzer": ["miniature schnauzer", "schnauzer (miniature)"],
    "frenchie": ["french bulldog"],
    "shihtzu": ["shih tzu"],
    "maltese": ["maltese"],
    "papillon": ["papillon"],
    "jrt": ["jack russell terrier", "parson russell terrier", "russell terrier"],
    "cavalier": ["cavalier king charles spaniel"],
    "minpin": ["miniature pinscher"],
    "pug": ["pug"],
    "bichon": ["bichon frise"],
    "iggy": ["italian greyhound"],
    "peke": ["pekingese"],
    "boston": ["boston terrier"],
    "chin": ["japanese chin"],
    "spitz": ["japanese spitz"],
    "westie": ["west highland white terrier"],
    "sheltie": ["shetland sheepdog"],
    "cocker": ["cocker spaniel", "american cocker spaniel"],
    "griffon": ["brussels griffon"],
    "kingcharles": ["english toy spaniel", "king charles spaniel"],
    "corgi": ["pembroke welsh corgi", "corgi"],
    "beagle": ["beagle"],
    "border": ["border collie"],
    "shiba": ["shiba inu"],
    "dalmatian": ["dalmatian"],
    "chow": ["chow chow"],
    "bulldog": ["bulldog", "english bulldog"],
    "golden": ["golden retriever"],
    "lab": ["labrador retriever"],
    "gsd": ["german shepherd dog", "german shepherd"],
    "husky": ["siberian husky"],
    "bernese": ["bernese mountain dog"],
    "stbernard": ["saint bernard", "st. bernard"],
    "samoyed": ["samoyed"],
    "akita": ["akita", "japanese akita", "american akita"],
    "doberman": ["doberman pinscher", "doberman"],
    "stdpoodle": ["standard poodle", "poodle (standard)", "poodle"],
    "boxer": ["boxer"],
    "bordeaux": ["dogue de bordeaux"],
}
FALLBACK_NOTE = {
    "mdachs": "dachshund",
    "toypoodle": "poodle",
    "stdpoodle": "poodle",
}


def find_csv(name):
    """Return text of `name` from raw/ (plain file or inside any zip in raw/)."""
    for root, _, files in os.walk(RAW):
        for f in files:
            if f == name:
                return open(os.path.join(root, f), encoding="utf-8-sig").read()
    for root, _, files in os.walk(RAW):
        for f in files:
            if f.lower().endswith(".zip"):
                with zipfile.ZipFile(os.path.join(root, f)) as z:
                    for m in z.namelist():
                        if os.path.basename(m) == name:
                            return z.read(m).decode("utf-8-sig")
    return None


def rows(name, required=True):
    txt = find_csv(name)
    if txt is None:
        if required:
            sys.exit(f"ERROR: {name} not found in {RAW} (plain or inside a zip). "
                     "Download DarwinsArk.zip and ReferenceData.zip from Dryad first.")
        return None
    return list(csv.DictReader(io.StringIO(txt)))


def na(v):
    return v is None or str(v).strip() in ("", "NA", "#N/A", "N/A", "n/a", "<NA>")


def truthy(v):
    return str(v).strip().upper() in ("TRUE", "T", "1", "YES")


def norm_breed(b):
    b = re.sub(r"\s+", " ", str(b).strip().lower())
    if b == "flat-coated retrievers":
        b = "flat-coated retriever"
    if "cocker spaniel" in b:  # authors merge all cocker spaniels
        b = "cocker spaniel"
    return b


def stats(vals):
    n = len(vals)
    if n == 0:
        return None
    m = sum(vals) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in vals) / (n - 1)) if n > 1 else None
    return {"mean": round(m, 4), "sd": round(sd, 4) if sd is not None else None, "n": n}


def main():
    notes = []
    dogs = rows("DarwinsArk_20191115_dogs.csv")
    fs = rows("DarwinsArk_20191115_factor_scores.csv")
    facs = rows("DarwinsArk_20191115_factors.csv")
    ques = rows("DarwinsArk_20191115_questions.csv", required=False) or []

    # ---- factor definitions
    qtext = {}
    for q in ques:
        qid = q.get("id") or q.get("question")
        if qid:
            qtext[str(qid)] = q.get("string") or q.get("abbr_text") or ""
    loadcol = next((c for c in (facs[0].keys() if facs else [])
                    if "load" in c.lower()), None)
    fdef = {}
    for r in facs:
        try:
            k = int(float(r["factor"]))
        except (KeyError, ValueError):
            continue
        if k < 1 or k > 8:
            continue
        d = fdef.setdefault(k, {"key": f"F{k}", "name": None, "high_means": None,
                                "low_means": None, "_q": []})
        if not na(r.get("name")) and not d["name"]:
            d["name"] = r["name"]
        if not na(r.get("positive")) and not d["high_means"]:
            d["high_means"] = r["positive"]
        if not na(r.get("negative")) and not d["low_means"]:
            d["low_means"] = r["negative"]
        qid = r.get("question") or r.get("id")
        if not na(qid):
            ld = None
            if loadcol and not na(r.get(loadcol)):
                ld = float(r[loadcol])
            d["_q"].append((str(qid).replace(".0", ""), ld))
    factors = []
    for k in sorted(fdef):
        d = fdef[k]
        qs = sorted(d.pop("_q"), key=lambda t: -abs(t[1]) if t[1] is not None else 0)
        d["top_questions"] = [
            {"question": f"Q{q}", "text": qtext.get(q, ""),
             **({"loading": round(l, 3)} if l is not None else {})} for q, l in qs[:6]]
        d["description"] = (f"{d['name']}: high = {d['high_means']}; low = {d['low_means']}"
                            if d["name"] else None)
        factors.append(d)
    if loadcol is None:
        notes.append("factors.csv has no loading column; top_questions are in file order.")

    # ---- purebred breed label per dog
    cols = dogs[0].keys()
    use_flags = "cand" in cols or "conf" in cols
    if not use_flags:
        notes.append("dogs.csv has no cand/conf columns; purebred = owner_breed present AND purebred=='yes'.")
    breed_of = {}
    for d in dogs:
        did = d.get("id")
        if use_flags:
            if not (truthy(d.get("cand")) or truthy(d.get("conf"))):
                continue
        else:
            if na(d.get("owner_breed")) or str(d.get("purebred", "")).lower() != "yes":
                continue
        b = d.get("regseq_breed")
        if na(b):
            b = d.get("owner_breed")
        if na(b):
            b = d.get("consensus_breed")
        if na(b):
            continue
        breed_of[did] = norm_breed(b)

    # ---- scores
    by_factor_all = defaultdict(list)
    by_breed = defaultdict(lambda: defaultdict(dict))  # breed -> factor -> dog -> score
    for r in fs:
        try:
            k = int(float(r["factor"]))
        except (KeyError, ValueError):
            continue
        if k < 1 or k > 8 or na(r.get("score.norm")):
            continue
        v = float(r["score.norm"])
        by_factor_all[k].append(v)
        b = breed_of.get(r["dog"])
        if b:
            by_breed[b][k][r["dog"]] = v

    overall = {f"F{k}": stats(v) for k, v in sorted(by_factor_all.items())}

    out_breeds, missing = {}, []
    available = sorted(by_breed)
    for bid, cands in BREEDS.items():
        name = next((c for c in cands if c in by_breed), None)
        if name is None:
            missing.append({"id": bid, "reason": "breed name not found among purebred dogs",
                            "tried": cands})
            continue
        fstats = {f"F{k}": stats(list(by_breed[name][k].values())) for k in range(1, 9)
                  if by_breed[name].get(k)}
        n = max((s["n"] for s in fstats.values()), default=0)
        entry = {"datasetName": name, "n": n,
                 "factors": {k: {"mean": s["mean"], "sd": s["sd"], "n": s["n"]}
                             for k, s in fstats.items()}}
        if FALLBACK_NOTE.get(bid) == name:
            entry["note"] = f"no separate size variety in data; uses '{name}'"
        if n < MIN_N:
            missing.append({"id": bid, "reason": f"only n={n} (<{MIN_N})", "datasetName": name})
        else:
            out_breeds[bid] = entry

    result = {
        "source": {
            "paper": "Morrill K, et al. (2022) Ancestry-inclusive dog genomics challenges "
                     "popular breed stereotypes. Science 376(6592):eabk0639. "
                     "doi:10.1126/science.abk0639",
            "urls": ["https://datadryad.org/dataset/doi:10.5061/dryad.g4f4qrfr0",
                     "https://github.com/DarwinsArk/muttomics"],
            "license": "CC0-1.0 (Dryad)",
            "notes": notes + [
                "Factor scores = authors' score.norm (not recomputed).",
                "Breed = confirmed (genetic) breed if present, else owner-reported breed; "
                "dogs flagged candidate (cand) or confirmed (conf) purebred only.",
                "SD is sample SD (ddof=1).",
            ],
            "available_breed_names": available,
        },
        "factors": factors,
        "overall": overall,
        "breeds": out_breeds,
        "missing": missing,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"wrote {OUT}: {len(out_breeds)} breeds usable, {len(missing)} missing")


if __name__ == "__main__":
    main()
