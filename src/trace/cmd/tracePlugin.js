import { fitGraphHandler } from "../ui/components/topbar/fitButton.js";
import { traceLoader } from "../ui/components/topbar/traceLoader.js";
import { viewSwitcher } from "../ui/views/index.js";

export const loadTracePlugin = () => {
    traceLoader();
    fitGraphHandler();
    viewSwitcher();
}