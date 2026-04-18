// ═══════════════════════════════════════════════════════════
// DIARY REDUCER — Atomic state updates for all diary data
// Lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

export const initDiary = (initTypes, initChecks) => ({
  types: initTypes(),
  checks: initChecks(),
  cm: {},
  comp: {},
  wCal: null,
  wMacPct: null,
  wt: { start: "", end: "" },
  stallAdj: 0,
});

export function diaryReducer(state, action) {
  switch (action.type) {
    case "RESET":
      return initDiary(action.initT, action.initC);
    case "LOAD":
      return { ...state, ...action.data };
    case "LOAD_WT":
      return { ...state, wt: action.wt };
    case "SET_TYPES":
      return {
        ...state,
        types: action.types,
        checks: action.checks !== undefined ? action.checks : state.checks,
        cm: action.cm !== undefined ? action.cm : state.cm,
      };
    case "SET_CHECKS":
      return { ...state, checks: action.checks };
    case "SET_CM":
      return { ...state, cm: structuredClone(action.cm) };
    case "UPDATE_DAY":
      return {
        ...state,
        cm: { ...state.cm, [action.day]: structuredClone(action.meals) },
      };
    case "UPDATE_MEAL": {
      const dayCopy = structuredClone(state.cm[action.day] || []);
      const mIdx = dayCopy.findIndex((m) => m.id === action.mealId);
      if (mIdx !== -1) dayCopy[mIdx] = structuredClone(action.meal);
      return { ...state, cm: { ...state.cm, [action.day]: dayCopy } };
    }
    case "COMPLETE_DAY":
      return { ...state, comp: { ...state.comp, [action.day]: action.cals } };
    case "UNCOMPLETE_DAY": {
      const co = { ...state.comp };
      delete co[action.day];
      return { ...state, comp: co };
    }
    case "APPLY":
      return {
        ...state,
        wCal: action.wCal,
        wMacPct: action.wMacPct,
        cm: action.cm !== undefined ? action.cm : state.cm,
      };
    case "SET_WCAL":
      return { ...state, wCal: action.wCal };
    case "SET_WT":
      return { ...state, wt: action.wt };
    case "SET_STALL":
      return { ...state, stallAdj: action.stallAdj };
    default:
      return state;
  }
}
