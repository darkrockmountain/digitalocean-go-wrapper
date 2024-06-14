import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";

/**
 * Reads a file with UTF-8 encoding.
 * @param {string} filePath - The path of the file to read.
 * @returns {string} - The content of the file.
 */
export function readUTF8File(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Writes content to a file with UTF-8 encoding.
 * @param {string} filePath - The path of the file to write.
 * @param {string} content - The content to write to the file.
 */
export function writeUTF8File(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Reads a JSON file.
 * @param {string} filePath - The path of the JSON file.
 * @returns {object} - The parsed JSON data.
 */
export function readJsonFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContent);
}

/**
 * Writes data to a JSON file.
 * @param {string} filePath - The path of the JSON file.
 * @param {object} data - The data to write to the JSON file.
 */
export function writeJsonFile(filePath, data) {
  const jsonContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, jsonContent, "utf8");
}

/**
 * Removes the content of a folder.
 * @param {string} folderPath - The path of the folder to clear.
 */
export function removeFolderContent(folderPath) {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      removeFolderContent(fullPath);
      try {
        fs.rmdirSync(fullPath);
      } catch (e) {}
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

/**
 * Copies the contents of a source to a destination.
 * @param {string} sourceDir - The source path.
 * @param {string} destinationDir - The destination path.
 */
export function copy(sourceDir, destinationDir) {
  fsExtra.copySync(sourceDir, destinationDir);
}

/**
 * Check if the directory exist.
 * @param {string} path - The directory path to check.
 */
export function checkDirExists(path) {
  fsExtra.ensureDirSync(path);
}

/**
 * Removes the file or directory.
 * @param {string} path - The file or directory path to remove.
 */
export function remove(path) {
  fsExtra.removeSync(path);
}

/**
 * Checks if a file or directory exists.
 * @param {string} path - The path of the file or directory.
 * @returns {boolean} - True if the file or directory exists, false otherwise.
 */
export function exists(path) {
  return fs.existsSync(path);
}

/**
 * Lists all folders that start with a specific prefix.
 * @param {string} basePath - The base path to start the search.
 * @param {string} prefix - The prefix to match folders against.
 * @returns {string[]} - List of matched folders.
 */
export function listFoldersWithPrefix(basePath, prefix) {
  const absoluteBasePath = path.resolve(basePath);
  const result = [];

  function searchDir(currentPath) {
    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const fullPath = path.join(currentPath, file);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        if (file.startsWith(prefix)) {
          result.push(fullPath);
        }
        // Recurse into subdirectories
        searchDir(fullPath);
      }
    }
  }

  searchDir(absoluteBasePath);
  return result;
}

/**
 * Lists the contents of a directory.
 * @param {string} dirPath - The path of the directory to list.
 * @returns {string[]} - An array of filenames in the directory.
 */
export function listDirectoryContents(dirPath) {
  return fs.readdirSync(dirPath);
}
