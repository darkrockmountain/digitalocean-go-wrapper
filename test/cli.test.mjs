import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { DEFAULT_YAML_FILE, DEFAULT_GO_BUILT_NAME, DEFAULT_DO_WRAPPER_OUTPUT, DEFAULT_KEEP_WRAPPER, DEFAULT_FILES_TO_KEEP } from "../src/doProjectConverter.mjs";

// Load package.json
import packageJson from '../package.json' assert { type: 'json' };

// Import the CLI logic
let runCLI;

describe('CLI', function () {
  let convertDoGoProjectStub;

  beforeEach(async () => {
    convertDoGoProjectStub = sinon.stub() 

    // Use esmock to mock convertDoGoProject in the CLI logic
    runCLI = (await esmock('../src/cli.mjs', {
      '../src/doProjectConverter.mjs': {
        default: convertDoGoProjectStub
      }
    })).runCLI;
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge(runCLI);
  });

  it('should display help message with --help', async function () {
    const consoleLogStub = sinon.stub(console, 'log');
    await runCLI(['--help']);
    expect(consoleLogStub.calledWithMatch('Usage:')).to.be.true;
    consoleLogStub.restore();
  });

  it('should display version with --version', async function () {
    const consoleLogStub = sinon.stub(console, 'log');
    await runCLI(['--version']);
    expect(consoleLogStub.calledWithMatch(`${packageJson.name} version ${packageJson.version}`)).to.be.true;
    consoleLogStub.restore();
  });

  it('should run main logic with default values', async function () {
    await runCLI([]);
    expect(convertDoGoProjectStub.calledOnce).to.be.true;
  });

  it('should handle custom yaml_file and do_go_dir', async function () {
    await runCLI(['--yaml_file', 'custom.yaml', '--do_go_dir', 'src']);
    expect(convertDoGoProjectStub.calledOnce).to.be.true;
    expect(convertDoGoProjectStub.calledWith('src', './do_wrapped_function/', 'custom.yaml', DEFAULT_GO_BUILT_NAME, DEFAULT_FILES_TO_KEEP, DEFAULT_KEEP_WRAPPER, DEFAULT_DO_WRAPPER_OUTPUT)).to.be.true;
  });
});
