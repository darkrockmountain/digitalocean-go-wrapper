import shell from "shelljs";
import path from "path";
import { exists } from "./utils/fileUtils.mjs";

// Constants for Go commands
const GO_MOD_INIT_COMMAND = "go mod init go-project";
const GO_MOD_TIDY_COMMAND = "go mod tidy";
const GO_BUILD_COMMAND = "go build -o";

// Environment variables for Go build
const doEnvGOOS = "linux";
const doEnvGOARCH = "amd64";
const doEnvCGO_ENABLED = 0;

/**
 * Builds a Go project.
 *
 * @param {string} goProjectPath - The path of the Go project to build.
 * @param {string} builtName - The name of the built binary.
 * @returns {string} - The path to the compiled Go binary.
 * @throws Will throw an error if the build process fails.
 */
function buildGoProject(goProjectPath, builtName) {
  const originalPWD = shell.pwd().stdout;
  try {
    shell.cd(goProjectPath);

    // Initialize go.mod if it does not exist
    if (!exists("go.mod") && shell.exec(GO_MOD_INIT_COMMAND).code !== 0) {
      throw new Error("Error: Go mod init failed");
    }

    // Run go mod tidy
    if (shell.exec(GO_MOD_TIDY_COMMAND).code !== 0) {
      throw new Error("Error: executing go mod tidy on the wrapper");
    }

    // Build the Go project
    const buildCommand = `GOOS=${doEnvGOOS} GOARCH=${doEnvGOARCH} CGO_ENABLED=${doEnvCGO_ENABLED} ${GO_BUILD_COMMAND} ${builtName}`;
    if (shell.exec(buildCommand).code !== 0) {
      throw new Error("Error: Go build failed");
    }

    // Verify the existence of the compiled file
    const compiledWrapperPath = path.join(shell.pwd().stdout, builtName);
    if (!exists(compiledWrapperPath)) {
      throw new Error(
        `Error: Failure verifying existence of the compiled file at ${compiledWrapperPath}`
      );
    }

    return compiledWrapperPath;
  } catch (e) {
    throw e;
  } finally {
    shell.cd(originalPWD);
  }
}

export { buildGoProject };
