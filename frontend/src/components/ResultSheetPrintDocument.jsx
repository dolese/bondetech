import React from "react";
import { ResultSheetPreview } from "./ResultSheetPreview";

export function ResultSheetPrintDocument({ model, pageRanges, pageSize = "a3" }) {
  return (
    <ResultSheetPreview
      model={model}
      isMobile={false}
      pageSize={pageSize}
      mode="print"
      forcedPageRanges={pageRanges}
    />
  );
}
