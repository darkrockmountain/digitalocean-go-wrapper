import yaml from "js-yaml";
import path from "path";
import {
  readUTF8File,
  writeUTF8File,
  listDirectoryContents,
} from "./fileUtils.mjs";

/**
 * Reads and parses the YAML file.
 * @param {string} filePath - The path of the YAML file.
 * @returns {object} - The parsed YAML data.
 * @throws Will throw an error if the YAML file cannot be read or parsed.
 */
export function readProjectYaml(filePath) {
  const fileContents = readUTF8File(filePath);
  return yaml.load(fileContents);
}

/**
 * Writes data to a YAML file.
 * @param {string} filePath - The path of the YAML file.
 * @param {object} data - The data to write to the YAML file.
 */
export function writeYamlFile(filePath, data) {
  const yamlContent = yaml.dump(data, { forceQuotes: true, quotingType: '"' });
  writeUTF8File(filePath, yamlContent);
}

/**
 * Finds all files with the .yaml or .yml extension in the specified directory.
 * @param {string} directoryPath - The path of the directory to search.
 * @returns {string[]} - An array of file names with .yaml or .yml extensions.
 */
export function findYamlFiles(directoryPath) {
  const files = listDirectoryContents(directoryPath);
  return files.filter((file) => {
    const fileExtension = path.extname(file).toLowerCase();
    return fileExtension === ".yaml" || fileExtension === ".yml";
  });
}

/**
 * Reads and parses the YAML file in a directory.
 * @param {string} directoryPath - The directory path the YAML file is expected to be.
 * @returns {object} - The parsed YAML data.
 * @throws Will throw an error if no .yml files are found.
 */
export function getYamlData(directoryPath) {
  const yamlFiles = findYamlFiles(directoryPath);
  if (yamlFiles.length > 0) {
    return readProjectYaml(path.join(directoryPath, yamlFiles[0]));
  }
  throw new Error("Error .yml files found in the project");
}

/**
 * Checks if a parameter exists in the YAML content.
 * @param {object} yamlContent - The YAML content.
 * @param {string} parameter - The parameter to check.
 * @returns {boolean} - True if the parameter exists, false otherwise.
 */
export function hasParameter(yamlContent, parameter) {
  return (
    parameter.split(".").reduce((obj, key) => obj && obj[key], yamlContent) !=
    null
  );
}
