import { ParentState } from "./parent/ParentState";

const appEntry = "/Users/briand/dev/salestrader/apps/salestrader/src/index.js";
const parentState = new ParentState(appEntry);

parentState.handleOutstandingWork();
