// ═══════════════════════════════════════════════════════════
// MEAL ENGINE — auto-rebalance, micronutrient check,
// synergy/inhibitor check, fiber check, scale-recipe-group,
// overflow routing. All lifted verbatim from the legacy app
// to guarantee identical outputs.
// ═══════════════════════════════════════════════════════════

import { ci, sm, sa, dc, macroRole, carbGI, clampAmt, ingMin, ingMax } from "./macros.js";
import {
  PMAX,
  FIBER_TARGETS,
  PSYLLIUM_FIBER_PER_CAP,
  getRDA,
  RDA_LABELS,
  RDA_UNITS,
  RDA_TIPS,
  HIGH_IRON,
  HIGH_CALCIUM,
  HIGH_VIT_C,
  HIGH_ZINC,
  HIGH_FAT_SOL,
} from "./constants.js";
import { MI, FIBER_DATA } from "./data.js";
import { gS } from "./date.js";

// ═══════════════════════════════════════════════════════════
// AUTO REBALANCE — main engine. Adjusts unlocked ingredient
// amounts so the day's total matches `tgt` calories, honouring
// macro preference (high-carb / high-fat / balanced), the fat
// floor (hormonal health), and GI windows (carb partitioning).
// ═══════════════════════════════════════════════════════════
export function autoRebalance(meals,tgt,im,doneIds,pref,bodyWt){
  // Circuit breaker: prevent runaway repeated calls
  if (typeof autoRebalance._callCount === 'undefined') {
    autoRebalance._callCount = 0;
  }
  if (++autoRebalance._callCount > 20) {
    console.warn('autoRebalance circuit breaker triggered – aborting further adjustments');
    return meals;
  }
  const carbW=pref==="high-carb"?1.4:pref==="high-fat"?0.6:1.0;
  const fatW=pref==="high-fat"?1.4:pref==="high-carb"?0.6:1.0;
  const fatFloor=(bodyWt||83)*0.6; // minimum fat grams (0.6g/kg) for hormonal health
  // Training window 18:00–22:00: simple carbs prioritised; outside: complex carbs
  const _h=new Date().getHours();const isTrainWin=_h>=18&&_h<22;
  meals=dc(meals);const done=new Set(doneIds||[]);
  // Calculate locked calories
  let lk=0;meals.forEach(m=>{if(m.fixed||done.has(m.id)){lk+=sm(m,im).cals;return;}m.items.forEach(it=>{if(it.locked)lk+=ci(im[it.ingId],it.amt).cals;});});
  const adj=meals.filter(m=>!m.fixed&&!done.has(m.id));if(!adj.length)return meals;
  const bud=tgt-lk;

  // Split unlocked items by macro role
  const items=adj.flatMap(m=>m.items).filter(it=>!it.locked);
  const pItems=items.filter(it=>macroRole(im[it.ingId])==="p");
  const cfItems=items.filter(it=>macroRole(im[it.ingId])!=="p"); // carbs + fats

  // If budget is zero or negative, locked items already exceed target — 
  // reduce ALL unlocked items to their constraint minimums
  if(bud<=0){
    items.forEach(it=>{const ing=im[it.ingId];if(!ing)return;it.amt=clampAmt(ing,ingMin(ing));});
    return meals;
  }

  // Calculate current calories by group
  const pCals=pItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
  const cfCals=cfItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
  const totalUnlocked=pCals+cfCals;
  if(!totalUnlocked)return meals;

  const needCut=totalUnlocked>bud; // over budget = need to cut
  const diff=bud-totalUnlocked; // positive = need more, negative = need less
  // How severe is the overshoot? Scale aggressiveness accordingly
  const overPct=needCut?Math.abs(diff)/bud:0; // e.g. 0.3 = 30% over

  if(needCut){
    // CUTTING: Sort by caloric density — cut "invisible" high-cal items first, preserve volume
    const giPen=ing=>(macroRole(ing)==="c"&&((isTrainWin&&carbGI(ing)==="complex")||(!isTrainWin&&carbGI(ing)==="simple")))?1.5:1;
    const cfSorted=[...cfItems].sort((a,b)=>{
      const da=(im[a.ingId]?.per100?.cals||im[a.ingId]?.perUnit?.cals||100)*giPen(im[a.ingId]);
      const db=(im[b.ingId]?.per100?.cals||im[b.ingId]?.perUnit?.cals||100)*giPen(im[b.ingId]);
      return db-da; // highest effective density first
    });
    const cfBudget=bud-pCals;
    if(cfBudget>0&&cfCals>0){
      // Phase 1: Cut high-density items aggressively, low-density items gently
      // Scale cut limits with overshoot severity (overPct > 0.2 → more aggressive)
      const aggro=Math.min(1,0.6+overPct); // 0.6–1.0 range
      let remaining=cfCals-cfBudget; // how much we need to cut
      cfSorted.forEach(it=>{if(remaining<=0)return;const ing=im[it.ingId];if(!ing)return;
        const density=ing.per100?.cals||ing.perUnit?.cals||100;
        const mn=ingMin(ing);
        // Scale cut pct with aggro: at aggro=1.0 everything can be cut up to 90%
        const maxCutPct=density>200?Math.min(0.9,aggro):density>100?Math.min(0.7,aggro*0.8):Math.min(0.5,aggro*0.5);
        const maxCut=ci(ing,it.amt).cals*maxCutPct;
        const actualCut=Math.min(remaining,maxCut);
        const newCals=ci(ing,it.amt).cals-actualCut;
        const newAmt=clampAmt(ing,Math.max(mn,newCals/(density/100)));
        remaining-=(ci(ing,it.amt).cals-ci(ing,newAmt).cals);
        it.amt=newAmt;
      });
      // Phase 2: If still over, do uniform scale on what's left (respect constraint mins)
      const afterP1=items.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      if(afterP1>bud+20){const leftover=cfItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
        if(leftover>0){const sc2=Math.max(0,(bud-pItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0))/leftover);
          cfItems.forEach(it=>{const ing=im[it.ingId];if(!ing)return;
            it.amt=clampAmt(ing,Math.max(ingMin(ing),it.amt*sc2));});}}
      // Phase 3: Still over — reluctantly trim protein (respect constraint mins)
      const afterCF=items.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      if(afterCF>bud+20){
        const pBud=bud-cfItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
        const curP=pItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
        if(curP>0&&pBud>0){const pScale=pBud/curP;
          pItems.forEach(it=>{const ing=im[it.ingId];if(!ing)return;
            it.amt=clampAmt(ing,Math.max(ingMin(ing),it.amt*pScale));});}
      }
    } else {
      // cfBudget <= 0: carb/fat budget exhausted by protein — cut everything to minimums then scale up to bud
      items.forEach(it=>{const ing=im[it.ingId];if(!ing)return;it.amt=clampAmt(ing,ingMin(ing));});
      // Now scale back up if there's room
      const minCals=items.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      if(minCals<bud&&minCals>0){
        const sc=bud/minCals;
        cfItems.forEach(it=>{const ing=im[it.ingId];if(!ing)return;
          it.amt=clampAmt(ing,Math.min(ingMax(ing),it.amt*sc));});
      }
    }
  } else {
    // ADDING: Scale carbs/fats up first, then protein if needed
    const cfTarget=cfCals+diff; // give all extra to carbs/fats weighted by preference
    if(cfCals>0){
      // GI partitioning: split carbs into simple/complex, weighted by training window
      const cItems=cfItems.filter(it=>macroRole(im[it.ingId])==="c");
      const fItems2=cfItems.filter(it=>macroRole(im[it.ingId])==="f");
      const simpleItems=cItems.filter(it=>carbGI(im[it.ingId])==="simple");
      const complexItems=cItems.filter(it=>carbGI(im[it.ingId])==="complex");
      const sCals=simpleItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      const xCals=complexItems.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      const fCals2=fItems2.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      // Training window 18-22: simple 1.4×, complex 0.7×; outside: invert
      const sGI=isTrainWin?1.4*carbW:0.7*carbW;
      const xGI=isTrainWin?0.7*carbW:1.4*carbW;
      const wTotalGI=sCals*sGI+xCals*xGI+fCals2*fatW||1;
      const sShare=cfTarget*(sCals*sGI/wTotalGI);
      const xShare=cfTarget*(xCals*xGI/wTotalGI);
      const fShare=cfTarget*(fCals2*fatW/wTotalGI);
      const sScale=sCals>0?sShare/sCals:1;
      const xScale=xCals>0?xShare/xCals:1;
      const fScale2=fCals2>0?fShare/fCals2:1;
      cfItems.forEach(it=>{const ing=im[it.ingId];if(!ing)return;const stp=ing.step||5;const mx=ing.maxAmt||it.amt*2;
        const sc2=macroRole(ing)==="f"?fScale2:carbGI(ing)==="simple"?sScale:xScale;
        if(ing.unit==="piece")it.amt=Math.max(1,Math.min(mx,Math.round(it.amt*sc2)));
        else it.amt=Math.max(stp,Math.min(mx,Math.round((it.amt*sc2)/stp)*stp));});
      // If carbs/fats maxed out, overflow into protein
      const afterCF=items.reduce((s,it)=>s+ci(im[it.ingId],it.amt).cals,0);
      const remaining=bud-afterCF;
      if(remaining>20&&pCals>0){const pScale=(pCals+remaining)/pCals;
        pItems.forEach(it=>{const ing=im[it.ingId];if(!ing)return;const stp=ing.step||5;const mx=ing.maxAmt||it.amt*2;
          if(ing.unit==="piece")it.amt=Math.max(1,Math.min(mx,Math.round(it.amt*pScale)));
          else it.amt=Math.max(stp,Math.min(mx,Math.round((it.amt*pScale)/stp)*stp));});}
    } else {
      // No carb/fat items — scale protein
      const sc=bud/totalUnlocked;
      items.forEach(it=>{const ing=im[it.ingId];if(!ing)return;const stp=ing.step||5;const mx=ing.maxAmt||it.amt*2;
        if(ing.unit==="piece")it.amt=Math.max(1,Math.min(mx,Math.round(it.amt*sc)));
        else it.amt=Math.max(stp,Math.min(mx,Math.round((it.amt*sc)/stp)*stp));});
    }
  }

  // Gap fill pass — bump carbs/fats first by their step, preferred GI type first
  let gap2=tgt-sa(meals,im).cals;
  const preferredGI=isTrainWin?"simple":"complex";
  const cfBumps=cfItems.filter(it=>im[it.ingId]?.unit!=="piece")
    .sort((a,b)=>{const ap=carbGI(im[a.ingId])===preferredGI?0:1;const bp=carbGI(im[b.ingId])===preferredGI?0:1;return ap-bp;});
  const pBumps=pItems.filter(it=>im[it.ingId]?.unit!=="piece");
  let tries=0;
  // UNDER target — bump up
  while(gap2>10&&tries<20){tries++;
    for(const it of cfBumps){if(gap2<=10)break;const ing=im[it.ingId];if(!ing||it.amt>=ingMax(ing))continue;const stp=ing.step||5;it.amt=Math.min(ingMax(ing),it.amt+stp);gap2=tgt-sa(meals,im).cals;}
    if(gap2<=10)break;
    for(const it of pBumps){if(gap2<=10)break;const ing=im[it.ingId];if(!ing||it.amt>=ingMax(ing))continue;const stp=ing.step||5;it.amt=Math.min(ingMax(ing),it.amt+stp);gap2=tgt-sa(meals,im).cals;}
  }
  // OVER target — trim down (reverse of bump: reduce by step, highest density first)
  const cfTrims=[...cfItems].filter(it=>im[it.ingId]?.unit!=="piece")
    .sort((a,b)=>{const da=im[a.ingId]?.per100?.cals||100;const db=im[b.ingId]?.per100?.cals||100;return db-da;});
  const pTrims=pItems.filter(it=>im[it.ingId]?.unit!=="piece");
  let tries2=0;
  while(gap2<-10&&tries2<20){tries2++;
    let trimmed=false;
    for(const it of cfTrims){if(gap2>=-10)break;const ing=im[it.ingId];if(!ing)continue;const mn=ingMin(ing);const stp=ing.step||5;
      if(it.amt<=mn)continue;it.amt=Math.max(mn,it.amt-stp);gap2=tgt-sa(meals,im).cals;trimmed=true;}
    if(gap2>=-10)break;
    for(const it of pTrims){if(gap2>=-10)break;const ing=im[it.ingId];if(!ing)continue;const mn=ingMin(ing);const stp=ing.step||5;
      if(it.amt<=mn)continue;it.amt=Math.max(mn,it.amt-stp);gap2=tgt-sa(meals,im).cals;trimmed=true;}
    if(!trimmed)break; // all items at minimum, can't trim further
  }
  // Overflow: if gap remains and some items hit their constraint max, route into secondary carbs in the same meal
  const postGap=tgt-sa(meals,im).cals;
  if(postGap>20)meals=overflowToSecondaryCarb(meals,postGap,im);

  // Protein cap
  let tot=sa(meals,im);if(tot.p>PMAX){const w=adj.flatMap(m=>m.items).find(it=>it.ingId==="whey"&&!it.locked);
    if(w&&w.amt>15){w.amt=Math.max(15,w.amt-Math.round((tot.p-PMAX)/0.9));}}
  // Fat floor guardrail — prevent hormonal crash from ultra-low fat
  tot=sa(meals,im);if(tot.f<fatFloor){
    const fatItems=adj.flatMap(m=>m.items).filter(it=>!it.locked&&["Fats","Snack"].includes(im[it.ingId]?.cat));
    const deficit=fatFloor-tot.f;let added=0;
    for(const it of fatItems){if(added>=deficit)break;const ing=im[it.ingId];if(!ing)continue;
      const stp=ing.step||5;const canAdd=Math.min((ing.maxAmt||it.amt*2)-it.amt,Math.ceil((deficit-added)/(ing.per100?.f||1)*100));
      const bump=Math.max(stp,Math.round(canAdd/stp)*stp);it.amt=Math.min(ing.maxAmt||it.amt+bump,it.amt+bump);
      added=sa(meals,im).f-tot.f+added;}}
  return meals;
}

// ═══════════════════════════════════════════════════════════
// MICRONUTRIENT CHECK — tallies per-meal micros vs RDA
// ═══════════════════════════════════════════════════════════
export function microCheck(meals,isTraining){
  const rda=getRDA(isTraining);
  const totals={};Object.keys(rda).forEach(k=>{totals[k]=0;});
  meals.forEach(m=>m.items.forEach(it=>{
    const md=MI[it.ingId];if(!md)return;
    const mult=md.isP?it.amt:(it.amt/100);
    Object.keys(rda).forEach(k=>{if(md[k])totals[k]+=md[k]*mult;});
  }));
  return Object.keys(rda).map(k=>({
    key:k,name:RDA_LABELS[k],unit:RDA_UNITS[k],rda:rda[k],
    actual:Math.round(totals[k]*10)/10,
    pct:Math.min(999,Math.round(totals[k]/rda[k]*100)),
    ok:totals[k]>=rda[k]*0.7,
    tip:RDA_TIPS[k]
  }));
}

// ═══════════════════════════════════════════════════════════
// SYNERGY CHECK — inhibitors & synergies across meals
// ═══════════════════════════════════════════════════════════
export function synCheck(meals){
  const notes=[];const seen=new Set();
  const addNote=(type,icon,msg)=>{
    // Global dedup key = tip body after "MealName: " — strips meal context so the same
    // tip for multiple meals is only added once (first occurrence wins).
    const tipBody=msg.includes(": ")?msg.slice(msg.indexOf(": ")+2):msg;
    const k=tipBody.slice(0,60);
    if(seen.has(k))return;seen.add(k);
    notes.push({type,icon,msg,tipBody});
  };

  meals.forEach(m=>{
    const ids=m.items.map(it=>it.ingId);
    const hasIron=ids.some(id=>HIGH_IRON.includes(id));
    const hasCalc=ids.some(id=>HIGH_CALCIUM.includes(id));
    const hasVitC=ids.some(id=>HIGH_VIT_C.includes(id));
    const hasZinc=ids.some(id=>HIGH_ZINC.includes(id));
    const hasFat=ids.some(id=>HIGH_FAT_SOL.includes(id));

    // INHIBITORS
    if(hasIron&&hasCalc)addNote("warn","⚠️",`${gS(m.name)}: Calcium inhibits iron absorption by ~50%. Separate dairy from iron-rich foods.`);
    if(hasZinc&&hasCalc&&!hasIron)addNote("warn","⚠️",`${gS(m.name)}: Calcium reduces zinc uptake. Space dairy from zinc sources.`);

    // SYNERGIES
    if(hasIron&&hasVitC)addNote("good","✅",`${gS(m.name)}: Vit C + Iron = up to 3× absorption.`);
    if(ids.includes("baby-spinach")&&hasFat)addNote("good","✅",`${gS(m.name)}: Fat unlocks fat-soluble vitamins (A, K) from spinach.`);
    if(ids.includes("salmon")&&hasFat)addNote("good","✅",`${gS(m.name)}: Omega-3 + fat = optimal absorption.`);

    // BIO-HACKER BOOSTERS — micro-additions for max nutrient extraction
    if(hasIron&&!hasVitC)addNote("tip","🧪",`${gS(m.name)}: Add a squeeze of lemon juice (~5ml, 1kcal) to boost iron absorption 3×.`);
    if(ids.includes("jalfrezi")||ids.includes("chilli-mix"))addNote("tip","🧪",`${gS(m.name)}: Add a pinch of black pepper (2kcal) — piperine boosts curcumin absorption from spices by 2000%.`);
    if(ids.includes("baby-spinach")&&!hasFat)addNote("tip","🧪",`${gS(m.name)}: Drizzle 5ml olive oil (40kcal) on spinach — unlocks beta-carotene and vitamin K absorption.`);
    if(ids.includes("porridge-oats"))addNote("tip","🧪",`${gS(m.name)}: Add a pinch of cinnamon (0kcal) — helps regulate blood sugar response from oats.`);
    if(ids.includes("whole-egg")&&!ids.includes("baby-spinach"))addNote("tip","🧪",`${gS(m.name)}: Pair eggs with spinach or tomatoes — the fat in yolks boosts carotenoid absorption by 3-8×.`);
    if(ids.includes("hp-yogurt")||ids.includes("greek-light"))addNote("tip","🧪",`${gS(m.name)}: Add 5g ground flaxseed (27kcal) for omega-3 + fibre. Pairs well with yogurt.`);
    if((ids.includes("chicken-breast")||ids.includes("beef-mince"))&&!ids.includes("baby-spinach"))addNote("tip","🧪",`${gS(m.name)}: Add a handful of rocket/watercress (3kcal) — nitrates improve blood flow to muscles.`);
    if(ids.includes("dark-choc"))addNote("good","✅",`${gS(m.name)}: Dark chocolate provides magnesium, iron, and flavanols. Pair with berries for antioxidant synergy.`);
    if(ids.includes("banana")&&(ids.includes("porridge-oats")||ids.includes("hp-yogurt")))addNote("good","✅",`${gS(m.name)}: Banana's prebiotic fibre feeds probiotics in yogurt/oats — gut health synergy.`);
  });

  // Cross-meal daily suggestions
  const allIds=meals.flatMap(m=>m.items.map(it=>it.ingId));
  if(allIds.some(id=>HIGH_IRON.includes(id))&&!allIds.some(id=>HIGH_VIT_C.includes(id)))
    addNote("tip","🧪","No vitamin C today — a squeeze of lemon on any meal boosts iron absorption at nearly zero calories.");
  if(!allIds.includes("salmon")&&!allIds.includes("tuna-brine")&&!allIds.includes("olive-oil"))
    addNote("tip","🧪","No omega-3 sources today — consider 5ml olive oil drizzle (40kcal) or fish oil supplement.");

  return notes;
}

// ═══════════════════════════════════════════════════════════
// FIBER CHECK & SUPPLEMENT SUGGESTION
// ═══════════════════════════════════════════════════════════
export function fiberCheck(meals,im){
  let sol=0,insol=0;
  meals.forEach(m=>m.items.forEach(it=>{
    const fd=FIBER_DATA[it.ingId];
    const ing=im?.[it.ingId];
    // FIBER_DATA takes precedence; Pantry items carry sol_fiber/insol_fiber inline
    const fSol=fd?.sol??ing?.sol_fiber??0;
    const fInsol=fd?.insol??ing?.insol_fiber??0;
    if(!fSol&&!fInsol)return;
    const mult=(fd?.isP||ing?.unit==="piece")?it.amt:(it.amt/100);
    sol+=fSol*mult;insol+=fInsol*mult;
  }));
  sol=Math.round(sol*10)/10;insol=Math.round(insol*10)/10;
  const total=Math.round((sol+insol)*10)/10;
  const defTotal=Math.max(0,Math.round((FIBER_TARGETS.total-total)*10)/10);
  const defSol=Math.max(0,Math.round((FIBER_TARGETS.sol-sol)*10)/10);
  const defInsol=Math.max(0,Math.round((FIBER_TARGETS.insol-insol)*10)/10);
  const triggered=total<FIBER_TARGETS.total||sol<FIBER_TARGETS.sol||insol<FIBER_TARGETS.insol;
  // Psyllium is 85% soluble — calculate caps for whichever deficit requires most
  // 1 cap = 0.5g total = 0.425g soluble.  Cap recommendation at 12 (6g fiber)
  const psylliumCaps=triggered?Math.min(12,Math.ceil(Math.max(defTotal/PSYLLIUM_FIBER_PER_CAP,defSol/0.425))):0;
  return{total,sol,insol,defTotal,defSol,defInsol,triggered,psylliumCaps};
}

// ═══════════════════════════════════════════════════════════
// PROPORTIONAL RATIO-LOCKED SCALING
// Scales all unlocked items of a given macro role within one
// meal by ±10% while preserving their current ratio.
// ═══════════════════════════════════════════════════════════
export function scaleRecipeGroup(meals,mealId,role,direction,im){
  const mIdx=meals.findIndex(m=>m.id===mealId);
  if(mIdx===-1)return meals;
  const groupIdxs=meals[mIdx].items
    .map((_,i)=>i)
    .filter(i=>!meals[mIdx].items[i].locked&&macroRole(im[meals[mIdx].items[i].ingId])===role);
  if(!groupIdxs.length)return meals;
  const scale=direction>0?1.10:0.90;
  const result=dc(meals);
  groupIdxs.forEach(i=>{
    const it=result[mIdx].items[i];
    const ing=im[it.ingId];if(!ing)return;
    it.amt=clampAmt(ing,it.amt*scale);
  });
  return result;
}

// ═══════════════════════════════════════════════════════════
// OVERFLOW — when a capped item cannot absorb its share of
// calories, push remainder into unlocked secondary carb
// sources within the same meal.
// ═══════════════════════════════════════════════════════════
function overflowToSecondaryCarb(meals,gap,im){
  if(gap<=20)return meals;
  const result=dc(meals);
  const mealsWithCaps=result.filter(meal=>
    !meal.fixed&&meal.items.some(it=>{const ing=im[it.ingId];return ing&&!it.locked&&it.amt>=ingMax(ing);})
  );
  if(!mealsWithCaps.length)return result;
  let rem=gap;
  for(const meal of mealsWithCaps){
    if(rem<=10)break;
    const carbTargets=meal.items.filter(it=>{const ing=im[it.ingId];
      return ing&&!it.locked&&macroRole(ing)==="c"&&it.amt<ingMax(ing);});
    if(!carbTargets.length)continue;
    const perTarget=rem/carbTargets.length;
    for(const it of carbTargets){
      if(rem<=10)break;
      const ing=im[it.ingId];
      const calPer=ing.unit==="piece"?(ing.perUnit?.cals||0):((ing.per100?.cals||100)/100);
      if(calPer<=0)continue;
      const addAmt=Math.min(perTarget/calPer,ingMax(ing)-it.amt);
      if(addAmt<(ing.step||5))continue;
      const before=ci(ing,it.amt).cals;
      it.amt=clampAmt(ing,it.amt+addAmt);
      rem-=ci(ing,it.amt).cals-before;
    }
  }
  return result;
}
