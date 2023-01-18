import * as fs from "fs";
import * as path from "path";

import chalk from "chalk";
import promptSync, { AutoCompleteFunction } from "prompt-sync";

const __dirname = path.resolve(path.dirname(''));

function printHeading(heading: string, padding = 10): void {
  const moddedString = heading.padStart(heading.length + padding, " ") + " ".repeat(padding);
  console.log();
  console.log("-".repeat(moddedString.length))
  console.log(chalk.green(moddedString));
  console.log("-".repeat(moddedString.length))
  console.log();
}


function promptComplete(commands: string[]): AutoCompleteFunction {
  return function (str) {
    var i;
    var ret = [];
    for (i = 0; i < commands.length; i++) {
      if (commands[i].indexOf(str) == 0)
        ret.push(commands[i]);
    }
    return ret;
  };
};


function loadTemplateFromFile(): string {
  const templatePrompt = promptSync({
    sigint: true,
    autocomplete: promptComplete(fs.readdirSync(__dirname)),
  });

  const templateName = templatePrompt("Template file name: ");

  if (templateName.replaceAll(" ", "") === "") {
    throw new Error("Template file name is empty!");
  }

  const currentPath = path.resolve(__dirname);
  const templateFilePath = path.isAbsolute(templateName) ? path.resolve(templateName) : path.join(currentPath, templateName);

  if (fs.existsSync(templateFilePath) === false) {
    throw new Error("Template file does not exist!");
  }

  return fs.readFileSync(templateFilePath, "utf-8");
}

function loadFieldsFromJsonFile(): Record<string, string> {
  const jsonPrompt = promptSync({
    sigint: true,
    autocomplete: promptComplete(fs.readdirSync(__dirname)),
  });

  const jsonName = jsonPrompt("JSON file name: ");

  if (jsonName.replaceAll(" ", "") === "") {
    throw new Error("JSON file name is empty!");
  }

  const currentPath = path.resolve(__dirname);
  const jsonFilePath = path.isAbsolute(jsonName) ? path.resolve(jsonName) : path.join(currentPath, jsonName);

  if (fs.existsSync(jsonFilePath) === false) {
    throw new Error("JSON file does not exist!");
  }

  const jsonText = fs.readFileSync(jsonFilePath, "utf-8");
  const json = JSON.parse(jsonText);

  const filteredJson = Object.fromEntries( // Filter out non-string values
    Object.entries(json).filter(([_, value]) => typeof value === "string")
  ) as Record<string, string>;

  return filteredJson;
}

function processTemplate(templateText: string, fields: Record<string, string>): string {
  for (const [key, value] of Object.entries(fields)) {
    const regex = new RegExp(`{{ *${key} *}}`, "g");
    templateText = templateText.replaceAll(regex, value);
  }
  return templateText;
}

function dumpTemplate(templateText: string): void {
  const dumpPrompt = promptSync({
    sigint: true,
    autocomplete: promptComplete(["yes", "no"]),
  });

  const dump = dumpPrompt("Dump template to file? [y/N]: ");

  if (dump !== "y") return;


  const outputFilePrompt = promptSync({
    sigint: true,
  });

  const outputFileName = outputFilePrompt("Output file name: ");
  const dumpPath = path.join(__dirname, outputFileName);
  fs.writeFileSync(dumpPath, templateText);

  console.log(chalk.green(`Template dumped to ${dumpPath}`));
}

function debugTemplate(templateText: string): string {
  const regex = /{{[a-zA-Z_0-9 ]+}}/g;
  const matches = templateText.matchAll(regex);

  for (const match of matches) {
    for (const group of match) {
      templateText = templateText.replaceAll(group, chalk.green(group));
    }
  }

  return templateText;
}

function main(): void {
  const templateText = loadTemplateFromFile();

  printHeading("Template Debugging");
  const debuggedTemplate = debugTemplate(templateText);
  console.log("Fields will be highlighted in green: ");
  console.log(debuggedTemplate);

  printHeading("Loading Fields");
  const fields = loadFieldsFromJsonFile();
  console.log(chalk.yellow("Remember only fields with string values will be picked up!"));
  console.log(fields);

  printHeading("Processed Template");
  const highlightedFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, chalk.green(value)]));
  const processedTemplateDebugged = processTemplate(templateText, highlightedFields);
  console.log("Replaced values will be highlighted in green: ");
  console.log(processedTemplateDebugged);


  const processedTemplate = processTemplate(templateText, fields);
  printHeading("Dumping Template")
  dumpTemplate(processedTemplate);
}

printHeading("Template Processor by Rizwan Mustafa");
console.log();


while (true) {
  try {
    main();
    if (promptSync()(chalk.yellow("Continue? [Y/n]: ")) === "n") break;
  }
  catch (e) {
    console.error(chalk.red((e as Error).message));
  }
}