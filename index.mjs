#!/usr/bin/env node

// Import required modules
import convertDoGoProject, { DEFAULT_YAML_FILE, DEFAULT_GO_BUILT_NAME, DEFAULT_DO_WRAPPER_OUTPUT, DEFAULT_KEEP_WRAPPER, DEFAULT_FILES_TO_KEEP } from "./src/doProjectConverter.mjs";
import minimist from "minimist";

// Constants
const DEFAULT_DO_GO_DIR = "./";
const DEFAULT_DO_PROJECT_OUTPUT = "./do_wrapped_function/";

// Parse command line arguments using minimist
const argv = minimist(process.argv.slice(2), {
  alias: {
    yf: "yaml_file",
    d: "do_go_dir",
    out: "do_project_output",
  },
  default: {
    do_go_dir: DEFAULT_DO_GO_DIR,
    yaml_file: DEFAULT_YAML_FILE,
    do_project_output: DEFAULT_DO_PROJECT_OUTPUT,
    do_wrapper_output: DEFAULT_DO_WRAPPER_OUTPUT,
    go_built_name: DEFAULT_GO_BUILT_NAME,
    files_to_keep: DEFAULT_FILES_TO_KEEP,
    keep_wrapper: DEFAULT_KEEP_WRAPPER,
  },
});

/**
 * Main execution function
 * @param {string} doGoDir - Directory containing Go files.
 * @param {string} doProjectOutput - Output directory for the wrapped project.
 * @param {string} yamlFile - Path to the YAML file.
 * @param {string} goBuiltName - Name of the built Go binary.
 * @param {Array<string>} filesToKeep - Array of files to keep.
 * @param {boolean} keepWrapper - Flag to keep the wrapper.
 * @param {string} doWrapperOutput - Output directory for the wrapper.
 */
await convertDoGoProject(
  argv.do_go_dir,
  argv.do_project_output,
  argv.yaml_file,
  argv.go_built_name,
  argv.files_to_keep,
  argv.keep_wrapper,
  argv.do_wrapper_output
);
