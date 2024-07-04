import path from "path";
import { listDirectoryContents, readUTF8File, writeUTF8File } from "./utils/fileUtils.mjs";

// Constants
const MAIN_FUNCTION_SUBSTITUTION = 'panic("mainFunctionWrapper not implemented")';
const EVENT_HANDLER_SUBSTITUTION = "unmarshalEvent[[]byte](eventStr)";
const GOLANG_WRAPPER_FILE_NAME = "do_go_wrapper.go";
const GOLANG_WRAPPER_TEMPLATE_FILE_NAME = "do-main-wrapper.go";
const GO_WRAPPER_TEMPLATE_FILE_PATH = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../go-wrapper",
  GOLANG_WRAPPER_TEMPLATE_FILE_NAME
);

export {
  createGoWrapper,
  generateWrapper,
  getGoWrapperTemplate,
  findGoFileWithFunction
};

/**
 * Reads the Go wrapper template file.
 * @returns {string} - The content of the Go wrapper template file.
 */
function getGoWrapperTemplate() {
  return readUTF8File(GO_WRAPPER_TEMPLATE_FILE_PATH);
}



/**
 * Creates a Go wrapper for the main function.
 * @param {string} mainSourceCode - The source code of the main Go file.
 * @param {string} doGoMainFunctionName - The name of the main function.
 * @returns {string} - The Go wrapper code.
 */
function createGoWrapper(
  mainSourceCode,
  doGoMainFunctionName
) {
  const { functionCall, returns, eventType } = extractMainFunctionInfo(
    mainSourceCode,
    doGoMainFunctionName
  );

  const wrapperFunction = `${
    returns ? "resp := " : ""
  }${functionCall}; return handleResponse(${returns ? "resp" : "nil"})`;

  const goWrapperTemplateFile = getGoWrapperTemplate();

  return goWrapperTemplateFile
    .replace(MAIN_FUNCTION_SUBSTITUTION, wrapperFunction.trim())
    .replace(
      EVENT_HANDLER_SUBSTITUTION,
      eventType
        ? EVENT_HANDLER_SUBSTITUTION.replace("[]byte", eventType)
        : EVENT_HANDLER_SUBSTITUTION
    );
}

/**
 * Generates a Go wrapper for a DigitalOcean function.
 * @param {string} doGoFunctionDirPath - The directory path of the Go function.
 * @param {string} doGoMainFunctionName - The name of the main function.
 * @throws Will throw an error if the main function is not found.
 */
function generateWrapper(doGoFunctionDirPath, doGoMainFunctionName) {
  const mainSourceFileName = findGoFileWithFunction(
    doGoFunctionDirPath,
    doGoMainFunctionName
  );

  if (!mainSourceFileName) {
    throw new Error(
      `Main function ${doGoMainFunctionName} not found in any Go source files.`
    );
  }
  const mainSourceCode = readUTF8File(
    path.join(doGoFunctionDirPath, mainSourceFileName)
  );

  const goWrapper = createGoWrapper(mainSourceCode, doGoMainFunctionName);

  writeUTF8File(
    path.join(doGoFunctionDirPath, GOLANG_WRAPPER_FILE_NAME),
    goWrapper
  );
}



/**
 * Finds the Go source file containing the specified main function.
 * @param {string} dirPath - The directory path to search.
 * @param {string} mainFunctionName - The name of the main function.
 * @returns {string | null} - The file name containing the main function, or null if not found.
 */
function findGoFileWithFunction(dirPath, mainFunctionName) {
  const files = listDirectoryContents(dirPath);
  for (const file of files) {
    if (path.extname(file) === ".go") {
      const fileContents = readUTF8File(path.join(dirPath, file));
      if (new RegExp(`func\\s+${mainFunctionName}\\s*\\(`).test(fileContents)) {
        return file;
      }
    }
  }
  return null;
}

/**
 * Extracts information about the main function from the Go source code.
 * @param {string} sourceCode - The Go source code.
 * @param {string} functionName - The name of the main function.
 * @returns {object} - An object containing the function call, return type, and event type.
 * @throws Will throw an error if the function is not found or has invalid parameters.
 */
export function extractMainFunctionInfo(
  sourceCode,
  functionName
){
  const functionRegex = new RegExp(
    `func\\s+${functionName}\\s*\\(([^)]*)\\)\\s*([^)]*)\\s*\\{`,
    "s"
  );
  const match = sourceCode.match(functionRegex);

  if (!match) {
    throw new Error(`Error: Function ${functionName} not found in the Go source file.`);
  }

  const params = match[1]
    .trim()
    .split(",")
    .map((param) => param.trim())
    .filter((str) => str !== "");

  const indexOfContext = params.findIndex((item) =>
    item.includes("context.Context")
  );

  if (params.length > 2 || (params.length === 2 && indexOfContext === -1)) {
    throw new Error(
      `Error: Main function has wrong numbers of parameters. It can, at most, have the following optional params: one context.Context and one "Event" parameter (can be any type).`
    );
  }

  const eventIndex =
    params == null || params.length === 0
      ? -1
      : params.length === 1
      ? indexOfContext === -1
        ? 0
        : -1
      : params.length === 2
      ? indexOfContext === 0 || indexOfContext === 1
        ? 1 - indexOfContext
        : -1
      : -1;

  let eventType = null;

  if (eventIndex >= 0) {
    const match = params[eventIndex].trim().match(/\w+\s+(.+)/);
    if (!match) {
      throw new Error("Error: Event type not found in the params.");
    }
    eventType = match[1];
  }

  const returns = match[2].trim();

  let paramsString = "";
  if (eventType != null) {
    paramsString += `event${eventType ? `.(${eventType})` : ""}`;
  }

  if (indexOfContext !== -1) {
    if (paramsString) {
      if (indexOfContext === 0) {
        paramsString = "ctx, " + paramsString;
      } else {
        paramsString += ", ctx";
      }
    } else {
      paramsString += "ctx";
    }
  }

  return {
    functionCall: `${functionName}(${paramsString})`,
    returns: returns || null,
    eventType: eventType,
  };
}


