function htmlTransform(htmlText: string) {
  // Escape newlines, quotes etc that cause errors parsing the return value.
  const jsonStringHTMLTemplate = JSON.stringify(htmlText);

  return `var HTMLResourceService = require('alias!br.html-service');
  HTMLResourceService.registerHTMLFileContents(${jsonStringHTMLTemplate})`;
}

export function transformText(fileText: string, path: string) {
  if (path.endsWith(".html")) {
    return htmlTransform(fileText);
  }

  return fileText;
}
