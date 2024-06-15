// Import required modules
import convertDoGoProject, { DEFAULT_YAML_FILE, DEFAULT_GO_BUILT_NAME, DEFAULT_DO_WRAPPER_OUTPUT, DEFAULT_KEEP_WRAPPER, DEFAULT_FILES_TO_KEEP } from "./doProjectConverter.mjs";
import minimist from "minimist";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// Constants
const DEFAULT_DO_GO_DIR = "./";
const DEFAULT_DO_PROJECT_OUTPUT = "./do_wrapped_function/";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');


// Function to print help message
function printHelp() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const helpMessage = `
${packageJson.name} - ${packageJson.description}

Usage: ${Object.keys(packageJson.bin)[0]} [options]

Options:
  -h, --help          Show this help message and exit
  -y, --yaml_file     Path to the YAML file (default: ${DEFAULT_YAML_FILE})
  -d, --do_go_dir     Directory containing Go files (default: ${DEFAULT_DO_GO_DIR})
  -o, --out, 
  --do_project_output Output directory for the wrapped project (default: ${DEFAULT_DO_PROJECT_OUTPUT})
  --go_built_name     Name of the built Go binary (default: ${DEFAULT_GO_BUILT_NAME})
  --files_to_keep     Array of files to keep in each of the function folders (default: ${DEFAULT_FILES_TO_KEEP})
  --keep_wrapper      Flag to keep the wrapper in go. If true it will delete this intermediate step (default: ${DEFAULT_KEEP_WRAPPER})
  --do_wrapper_output Output directory for the go wrapper code (default: ${DEFAULT_DO_WRAPPER_OUTPUT})
  -v, --version       Show the version number

Examples:
  ${Object.keys(packageJson.bin)[0]} --yaml_file config.yaml --do_go_dir src --out dist
  `;

  console.log(helpMessage);
}

// Function to parse arguments and run the CLI
export async function runCLI(argv) {
  const args = minimist(argv, {
    alias: {
      y: "yaml_file",
      d: "do_go_dir",
      h: "help",
      o: "do_project_output",
      out: "do_project_output",
      v: "version",
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

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(`${packageJson.name} version ${packageJson.version}`);
    return;
  }

  await convertDoGoProject(
    args.do_go_dir,
    args.do_project_output,
    args.yaml_file,
    args.go_built_name,
    args.files_to_keep,
    args.keep_wrapper,
    args.do_wrapper_output
  );
}
