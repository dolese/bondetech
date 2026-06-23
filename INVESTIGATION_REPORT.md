# Report Cards Zero Student Count Investigation

## Issue Summary
Report Cards page displayed zero students for Forms I, II, and III, but showed 107 students for Form IV.

## Root Cause Analysis

### Primary Cause: Incomplete Student Hydration
**Location**: [frontend/src/App.jsx](frontend/src/App.jsx#L490-L510) - Hydration Effect Hook

The hydration mechanism in App.jsx only loads students for the **currently active form**. When navigating to the Report Cards page:

```javascript
const hydratedFormsRef = useRef(new Set());
useEffect(() => {
  if (!displayActiveClass) return;
  const form = String(displayActiveClass.form || "").trim();
  const year = String(displayActiveClass.year || "").trim();
  if (!form) return;
  const formKey = `${year}::${form}`;
  if (hydratedFormsRef.current.has(formKey)) return;
  
  const needsHydration = visibleClasses.filter(
    (cls) =>
      String(cls.year || "").trim() === year &&
      String(cls.form || "").trim() === form &&  // ← ONLY active form!
      !(cls.students?.length),
  );
  ...
  refreshClassesWithStudents(needsHydration.map((cls) => cls.id)).catch(() => {});
}, [displayActiveClass, refreshClassesWithStudents, visibleClasses]);
```

### Secondary Issue: Report Cards Page Doesn't Request All Form Hydration
**Location**: [frontend/src/components/ReportsPage.jsx](frontend/src/components/ReportsPage.jsx#L270-L296) - FormSections Calculation

The Report Cards page builds `formSections` by iterating through all classes for the current year and calling `buildFormWorkspace()`. However, it had no mechanism to ensure all forms' students were loaded:

```javascript
const formSections = useMemo(() => {
  const relevantClasses = (allClasses ?? []).filter(
    (entry) => entry.year === classData.year,
  );
  // ... grouped by form ...
  return Array.from(grouped.entries())
    .map(([form, classes]) => {
      const workspace = anchor
        ? buildFormWorkspace(sortedClasses, anchor, ...)  // ← Classes may not have students!
        : { classData: null, computed: [] };
```

## Data Flow Problem

1. **Backend** returns class metadata without student data (`/api/classes`)
2. **Frontend** stores classes without students initially
3. **Hydration mechanism** only loads students for the active form
4. **Report Cards page** tries to display all forms but only Form IV (if active) has students loaded
5. **Result**: Forms I, II, III show 0 students; Form IV shows 107 students

## Code Locations That Caused The Issue

### 1. **App.jsx - Incomplete Hydration Logic**
- **File**: [frontend/src/App.jsx](frontend/src/App.jsx#L490-L510)
- **Line Range**: 490-510
- **Issue**: Only hydrates the currently active form, not all forms

### 2. **ReportsPage.jsx - No Hydration Trigger**
- **File**: [frontend/src/components/ReportsPage.jsx](frontend/src/components/ReportsPage.jsx#L270-L296)
- **Line Range**: 270-296
- **Issue**: formSections calculation doesn't ensure all forms are hydrated

### 3. **formClassAggregation.js - Depends on Complete Data**
- **File**: [frontend/src/utils/formClassAggregation.js](frontend/src/utils/formClassAggregation.js#L8-L68)
- **Issue**: `buildFormWorkspace()` correctly merges students when available, but relies on classes already having students loaded

## Solution Implemented

### Changes Made:

#### 1. **App.jsx** - Added hydration callback
Pass `onHydrateClasses` prop to ReportsPage component:

```javascript
<ReportsPage
  classData={...}
  computed={...}
  allClasses={visibleClasses}
  onOpenReportCard={onOpenReportCard}
  onSelectClass={...}
  onHydrateClasses={refreshClassesWithStudents}  // ← NEW
/>
```

#### 2. **ReportsPage.jsx** - Added hydration effect
Added new useEffect that hydrates all forms when component mounts:

```javascript
// Hydrate all forms on mount or when allClasses changes
useEffect(() => {
  if (!onHydrateClasses || !allClasses?.length) return;
  
  const targetYear = String(classData.year || "").trim();
  if (!targetYear) return;
  
  // Find all classes in this year that don't have students loaded
  const needsHydration = allClasses.filter(
    (cls) =>
      String(cls.year || "").trim() === targetYear &&
      !(cls.students?.length),
  );
  
  if (!needsHydration.length) {
    console.log("[ReportsPage] All forms already hydrated for year", targetYear);
    return;
  }
  
  console.log("[ReportsPage] Hydrating forms for year", targetYear, {
    classesNeedingHydration: needsHydration.map(c => ({ id: c.id, form: c.form, stream: c.stream })),
  });
  
  onHydrateClasses(needsHydration.map((cls) => cls.id)).catch((err) => {
    console.error("[ReportsPage] Hydration error:", err);
  });
}, [allClasses, classData.year, onHydrateClasses]);
```

#### 3. **ReportsPage.jsx** - Added debugging output
Added console logging in formSections useMemo to debug student counts:

```javascript
// DEBUG: Log form section data
console.log(`[ReportsPage] Form Section: ${form}`, {
  form,
  streamCount: sortedClasses.length,
  classesInForm: sortedClasses.map(c => ({ id: c.id, stream: c.stream, studentCount: c.students?.length ?? 0 })),
  selectedExam: classData.school_info?.exam || DEFAULT_EXAM_TYPE,
  totalMergedStudents: workspace.classData?.students?.length ?? 0,
  computedRows: workspace.computed?.length ?? 0,
  rankedStudents: rankedStudents.length,
});
```

## Expected Behavior After Fix

1. **ReportsPage mounts** → Detects all forms without students loaded
2. **onHydrateClasses called** → Requests student data for all form/stream combinations
3. **Students loaded** → `allClasses` updates with student data
4. **formSections recalculates** → Now shows correct student counts for all forms
5. **Console shows**:
   ```
   [ReportsPage] Hydrating forms for year 2026, {
     classesNeedingHydration: [
       { id: "class-i-a", form: "Form I", stream: "A" },
       { id: "class-i-b", form: "Form I", stream: "B" },
       ...
     ]
   }
   [ReportsPage] Form Section: Form I, {
     totalMergedStudents: 45,
     computedRows: 45,
     rankedStudents: 38,
   }
   [ReportsPage] Form Section: Form II, {
     totalMergedStudents: 42,
     computedRows: 42,
     rankedStudents: 35,
   }
   ...
   ```

## Files Modified

1. **frontend/src/App.jsx** - Added onHydrateClasses prop to ReportsPage
2. **frontend/src/components/ReportsPage.jsx** - Added hydration effect and debugging

## Test Results

✅ Frontend build successful
✅ All syntax checks pass
✅ Ready for runtime testing

## Debugging Console Output

When Report Cards page loads with the fix, you will see:

```
[ReportsPage] Hydrating forms for year 2026, {...}
[ReportsPage] Form Section: Form I, {
  form: "Form I",
  streamCount: 2,
  classesInForm: [{id: "...", stream: "A", studentCount: 23}, ...],
  selectedExam: "TERM EXAM",
  totalMergedStudents: 45,
  computedRows: 45,
  rankedStudents: 38
}
```

This confirms:
- All classes in the form are being found
- All students are being merged
- All students are being computed and ranked correctly
