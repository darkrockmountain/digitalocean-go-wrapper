import { exec } from 'child_process';
import path from 'path';
import { exists } from './utils/fileUtils.mjs';

/**
 * Executes a command and returns a promise.
 *
 * @param {string} cmd - The command to execute.
 * @returns {Promise<void>} - A promise that resolves if the command succeeds and rejects if it fails.
 */
function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

// Constants for Go commands
const GO_MOD_INIT_COMMAND = 'go mod init go-project';
const GO_MOD_TIDY_COMMAND = 'go mod tidy';
const GO_BUILD_COMMAND = 'go build -o';

// Environment variables for Go build
const doEnvGOOS = 'linux';
const doEnvGOARCH = 'amd64';
const doEnvCGO_ENABLED = 0;

/**
 * Builds a Go project.
 *
 * @param {string} goProjectPath - The path of the Go project to build.
 * @param {string} builtName - The name of the built binary.
 * @returns {Promise<string>} - The path to the compiled Go binary.
 * @throws Will throw an error if the build process fails.
 */
async function buildGoProject(goProjectPath, builtName) {
  const originalPWD = process.cwd();
  try {
    process.chdir(goProjectPath);

    // Initialize go.mod if it does not exist
    if (!exists('go.mod')) {
      await execCommand(GO_MOD_INIT_COMMAND);
    }

    // Run go mod tidy
    await execCommand(GO_MOD_TIDY_COMMAND);

    // Build the Go project
    const buildCommand = `GOOS=${doEnvGOOS} GOARCH=${doEnvGOARCH} CGO_ENABLED=${doEnvCGO_ENABLED} ${GO_BUILD_COMMAND} ${builtName}`;
    await execCommand(buildCommand);
    

    // Verify the existence of the compiled file
    const compiledWrapperPath = path.join(process.cwd(), builtName);
    if (!exists(compiledWrapperPath)) {
      throw new Error(
        `Error: Failure verifying existence of the compiled file at ${compiledWrapperPath}`
      );
    }

    return compiledWrapperPath;
  } catch (e) {
    throw e;
  } finally {
    process.chdir(originalPWD);
  }
}

export { buildGoProject };
