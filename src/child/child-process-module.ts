import { extractDependencies } from "./child-tasks";

function handleParentMessage(message: {
  type: string;
  data: { path: string };
}) {
  const { type, data: { path } } = message;

  if (type === "extract-dependencies") {
    extractDependencies(path);
  } else {
    console.log(`Received unknown message ${JSON.stringify(type)}`);
  }
}

process.on("message", handleParentMessage);
