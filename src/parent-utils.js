const { fork } = require("child_process");
const { join } = require("path");

const childPath = join(__dirname, "./child-process-module");

/**
 * @param {*} parentState 
 */
function createProcess(parentState) {
  const childProcess = fork(childPath);

  childProcess.on("close", (code, signal) =>
    console.log(`Close: ${code}, ${signal}`)
  );
  childProcess.on("disconnect", () => console.log(`Disconnect`));
  childProcess.on("error", err => console.log(`Error: ${err}`));
  childProcess.on("exit", (code, signal) =>
    console.log(`Exit: ${code}, ${signal}`)
  );
  childProcess.on("message", message =>
    parentState.handleChildProcessMessage(message)
  );

  return childProcess;
}

module.exports.createProcess = createProcess;
