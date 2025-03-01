import { fitGraphHandler } from "../ui/topbar/fitButton.js";
import { traceLoader } from "../ui/topbar/traceLoader.js";
import { viewSwitcher } from "../ui/viewSwitcher.js";

export const loadTracePlugin = () => {
    traceLoader();
    fitGraphHandler();
    viewSwitcher();
}