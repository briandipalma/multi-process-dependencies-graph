const { fork } = require("child_process");
const { join } = require("path");

const childPath = join(__dirname, "./child-process-module");

function createProcess(parentState) {
  const childProcess = fork(childPath);

  childProcess.on("close", (...args) => console.log(`Close ${args}`));
  childProcess.on("disconnect", (...args) => console.log(`Disconnect ${args}`));
  childProcess.on("error", (...args) => console.log(`Error ${args}`));
  childProcess.on("exit", (...args) => console.log(`Exit ${args}`));
  childProcess.on("message", message =>
    parentState.handleChildProcessMessage(message)
  );

  return childProcess;
}

module.exports.createProcess = createProcess;
