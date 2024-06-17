import path from "path";
import os from "os";
import { generateWrapper } from "./goWrapperGenerator.mjs";
import { buildGoProject } from "./goBuilder.mjs";
import {
  readJsonFile,
  writeJsonFile,
  removeFolderContent,
  copy,
  listFoldersWithPrefix,
  checkDirExists,
  remove,
} from "./utils/fileUtils.mjs";
import {
  writeYamlFile,
  getYamlData,
  hasParameter,
} from "./utils/yamlUtils.mjs";

// Exported Constants
export const DEFAULT_YAML_FILE = "project.yml";
export const DEFAULT_GO_BUILT_NAME = "compiled_function";
export const DEFAULT_FILES_TO_KEEP = [".env"];
export const DEFAULT_KEEP_WRAPPER = false;
export const DEFAULT_DO_WRAPPER_OUTPUT = `do_go_lang_compiled_wrapper/`;

// Constants
const NODEJS_PACKAGE_FILE = "package.json";
const JS_WRAPPER_TEMPLATE_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../js-wrapper/"
);
const packagesFolderName = "packages";

/**
 * Updates the name in package.json based on the function path.
 * @param {object} jsonData - The JSON data from package.json.
 * @param {string} functionPath - The function path.
 * @returns {object} - The updated JSON data.
 * @throws Will throw an error if the function path format is invalid.
 */
function updatePackageJson(jsonData, functionPath) {
  const pathParts = functionPath.split("/");
  if (pathParts.length < 3 || pathParts[0] !== packagesFolderName) {
    throw new Error("Invalid function path format");
  }
  const newName = pathParts[pathParts.length - 1];
  jsonData.name = newName;
  return jsonData;
}

/**
 * Updates the YAML data based on the function path.
 * @param {object} yamlData - The YAML data.
 * @param {string} functionPath - The function path.
 * @returns {object} - The updated YAML data.
 * @throws Will throw an error if the function path format is invalid.
 */
function updateYamlData(yamlData, functionPath) {
  const pathParts = functionPath.split("/");
  if (pathParts.length !== 3 || pathParts[0] !== packagesFolderName) {
    throw new Error("Invalid function path format");
  }
  const packageName = pathParts[1];
  const functionName = pathParts[2];
  if (yamlData && yamlData.packages) {
    const pkg = yamlData.packages.find((pkg) => pkg.name === packageName);
    if (pkg && pkg.functions) {
      const func = pkg.functions.find((func) => func.name === functionName);
      if (func) {
        func.runtime = "nodejs:default";
        delete func.main;
      }
    }
  }
  return yamlData;
}

/**
 * Extracts the directory paths of Go functions from the YAML data.
 * @param {object} yamlData - The YAML data.
 * @returns {Array} - An array of Go function paths and their main functions.
 * @throws Will throw an error if no Go functions are found.
 */
function getDoGoFunction(yamlData) {
  let goFunctions = [];
  if (yamlData.packages && Array.isArray(yamlData.packages)) {
    for (const item of yamlData.packages) {
      if (item.functions && Array.isArray(item.functions)) {
        for (const funcs of item.functions) {
          if (funcs.runtime && funcs.runtime.includes("go")) {
            const goFunction = {
              goFunctionPath: `packages/${item.name}/${funcs.name}`,
              goMainFunctionName: hasParameter(funcs, "main")
                ? funcs.main
                : "Main",
            };
            goFunctions.push(goFunction);
          }
        }
      }
    }
  }
  if (goFunctions.length === 0) {
    throw new Error(
      "No Go function has been found in the Digital Ocean project provided"
    );
  }
  return goFunctions;
}

/**
 * Generates wrapped files by copying the original directory.
 * @param {string} do_go_dir - The original directory.
 * @param {string} tempDir - The temporary directory.
 * @param {Array<string>} filesToKeep - List of files to keep.
 */
function copyDoPackages(do_go_dir, tempDir, filesToKeep) {
  const packagesFolders = listFoldersWithPrefix(do_go_dir, packagesFolderName);
  packagesFolders.forEach((folderPath) =>
    copy(folderPath, path.join(tempDir, packagesFolderName))
  );
  if (filesToKeep && filesToKeep.length > 0) {
    filesToKeep.forEach((fileName) => {
      try { 
        copy(path.join(do_go_dir, fileName), path.join(tempDir, fileName));
      } catch (e) {}
    });
  }
}

/**
 * Converts a function into a Node.js package by wrapping it.
 * @param {object} yamlData - The YAML data.
 * @param {string} tempDir - The temporary directory.
 * @param {string} functionPath - The function path.
 * @param {string} compiledGoFilePath - The compiled Go file path.
 * @param {string} go_built_name - The compiled binary file of the Go project.
 * @returns {object} - The updated YAML data.
 */
function convertIntoNodeJSPackage(
  yamlData,
  tempDir,
  functionPath,
  compiledGoFilePath,
  go_built_name
) {
  const fullPath = path.join(tempDir, functionPath);
  removeFolderContent(fullPath);
  copy(JS_WRAPPER_TEMPLATE_DIR, fullPath);

  const filePath = path.join(fullPath, NODEJS_PACKAGE_FILE);

  let packageJsonData = readJsonFile(filePath);
  if (packageJsonData) {
    packageJsonData = updatePackageJson(packageJsonData, functionPath);
    writeJsonFile(filePath, packageJsonData);
  }

  copy(compiledGoFilePath, path.join(fullPath, go_built_name));
  return updateYamlData(yamlData, functionPath);
}

/**
 * Main function to execute the script.
 * @param {string} do_go_dir - The directory containing the Go source code.
 * @param {string} do_project_output - The output directory for the final project.
 * @param {string} yaml_file - The YAML file path.
 * @param {string} go_built_name - The name of the compiled Go binary.
 * @param {Array<string>} filesToKeep - List of files to keep.
 * @param {boolean} keep_wrapper - Flag to keep the wrapper directory.
 * @param {string} do_wrapper_output - The directory for the compiled wrapper output.
 */
async function convertDoGoProject(
  do_go_dir,
  do_project_output,
  yaml_file = DEFAULT_YAML_FILE,
  go_built_name = DEFAULT_GO_BUILT_NAME,
  filesToKeep = DEFAULT_FILES_TO_KEEP,
  keep_wrapper = DEFAULT_KEEP_WRAPPER,
  do_wrapper_output = DEFAULT_DO_WRAPPER_OUTPUT
) {
  const tempDir = path.join(os.tmpdir(), `copy-temp-${Date.now()}`);

  try {
    // Create temporary directory and copy necessary files
    checkDirExists(tempDir);
    copyDoPackages(do_go_dir, tempDir, filesToKeep);

    let yamlData = getYamlData(do_go_dir);

    for (const func of getDoGoFunction(yamlData)) {
      const do_go_wrapper_path = path.join(
        tempDir,
        do_wrapper_output,
        func.goFunctionPath
      );
      copy(path.join(tempDir, func.goFunctionPath), do_go_wrapper_path);
      generateWrapper(do_go_wrapper_path, func.goMainFunctionName);

      // const compiledWrapper = buildGoProject(do_go_wrapper_path, go_built_name);

      const compiledWrapper = await buildGoProject(
        do_go_wrapper_path,
        go_built_name
      );

      yamlData = convertIntoNodeJSPackage(
        yamlData,
        tempDir,
        func.goFunctionPath,
        compiledWrapper,
        go_built_name
      );
    }

    if (!keep_wrapper) {
      remove(path.join(tempDir, do_wrapper_output));
    }

    writeYamlFile(path.join(tempDir, yaml_file), yamlData);

    copy(tempDir, do_project_output);
  } finally {
    remove(tempDir);
  }
}

export default convertDoGoProject;

export {
  updatePackageJson,
  updateYamlData,
  getDoGoFunction,
  copyDoPackages,
  convertIntoNodeJSPackage,
};
