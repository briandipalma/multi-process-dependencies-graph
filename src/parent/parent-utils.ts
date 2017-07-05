const { fork } = require("child_process");
const { join } = require("path");

import { FileInfo, ParentState } from "./ParentState";

const childPath = join(__dirname, "../child/child-process-module");

export function createProcess(parentState: ParentState) {
  // Remove inspect flag as child processes try to bind to same port as parent.
  const execArgv = process.execArgv.filter(
    arg => arg.startsWith("--inspect") === false
  );
  const childProcess = fork(childPath, { execArgv });

  childProcess.on("close", (code: number, signal: string) =>
    console.log(`Close: ${code}, ${signal}`)
  );
  childProcess.on("disconnect", () => console.log(`Disconnect`));
  childProcess.on("error", (err: Error) => console.log(`Error: ${err}`));
  childProcess.on("exit", (code: number, signal: string) =>
    console.log(`Exit: ${code}, ${signal}`)
  );
  childProcess.on("message", (message: { type: string; data: FileInfo }) =>
    parentState.handleChildProcessMessage(message)
  );

  return childProcess;
}
