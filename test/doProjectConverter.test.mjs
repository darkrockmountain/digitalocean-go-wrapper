import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

// Define necessary paths and constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const do_go_dir = path.join(__dirname, "./data/digitalocean_functions");
const yaml_file = "project.yml";
const do_project_output = path.join(__dirname, "./data/out");
const do_wrapper_output = "do_go_lang_compiled_wrapper";
const go_built_name = "compiled_function";
const files_to_keep = [];
const now = 1717200000000;
const tmpdir = "/mock/tmpdir";

describe("doProjectConverter - doProjectConverter function", function () {
  let sandbox;
  const argv = {
    do_go_dir: do_go_dir,
    yaml_file: yaml_file,
    do_project_output: do_project_output,
    do_wrapper_output: do_wrapper_output,
    go_built_name: go_built_name,
    files_to_keep: files_to_keep,
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").returns(now);
    sandbox.stub(os, "tmpdir").returns(tmpdir);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("should execute the convertDoGoProject function correctly", async function () {
    // Set up test data and mocks
    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "go:default" }],
        },
      ],
    };

    const yamlFilePath = path.resolve(argv.do_go_dir, argv.yaml_file);

    // Mock shallow dependencies
    const mocks = {
      "../src/utils/fileUtils.mjs": {
        readJsonFile: sandbox.stub().returns({
          name: "do-js-wrapper",
          version: "1.0.0",
          main: "do-js-wrapper.js",
          keywords: [],
          author: "DarkRockMountain",
          license: "MIT",
          description:
            "A Node.js wrapper for a DigitalOcean function in Go, overcoming Go limitations on DigitalOcean by building binaries locally with the latest version.",
          repository: {
            type: "git",
            url: "git+https://github.com/darkrockmountain/digitalocean-go-wrapper.git",
          },
          dependencies: {
            child_process: "^1.0.2",
          },
        }),
        writeJsonFile: sandbox.stub().returns(true),
        removeFolderContent: sandbox.stub().returns(true),
        copy: sandbox.stub().returns(true),
        listFoldersWithPrefix: sandbox
          .stub()
          .returns(["packages/package-name/function-name"]),
        checkDirExists: sandbox.stub().returns(true),
        remove: sandbox.stub().returns(true),
      },
      "../src/utils/yamlUtils.mjs": {
        writeYamlFile: sandbox.stub().returns(true),
        getYamlData: sandbox.stub().returns(yamlData),
        hasParameter: sandbox.stub().returns(true),
      },
      "../src/goWrapperGenerator.mjs": {
        generateWrapper: sandbox.stub().returns(true),
      },
      "../src/goBuilder.mjs": {
        buildGoProject: sandbox.stub().resolves("compiled_wrapper_path"),
      },
    };

    const doProjectConverter = await esmock("../src/doProjectConverter.mjs", mocks);

    // Call the default function (convertDoGoProject)
    await doProjectConverter.default(
      argv.do_go_dir,
      argv.do_project_output,
      argv.yaml_file,
      argv.go_built_name,
      argv.files_to_keep,
      false,
      argv.do_wrapper_output
    );

    // Assertions
    const {
      readJsonFile,
      writeJsonFile,
      removeFolderContent,
      copy,
      listFoldersWithPrefix,
      checkDirExists,
      remove,
    } = mocks["../src/utils/fileUtils.mjs"];

    const { writeYamlFile, getYamlData, hasParameter } =
      mocks["../src/utils/yamlUtils.mjs"];

    const { generateWrapper } = mocks["../src/goWrapperGenerator.mjs"];
    const { buildGoProject } = mocks["../src/goBuilder.mjs"];

    expect(readJsonFile.called).to.be.true;
    expect(writeJsonFile.called).to.be.true;
    expect(removeFolderContent.called).to.be.true;
    expect(copy.called).to.be.true;
    expect(listFoldersWithPrefix.called).to.be.true;
    expect(checkDirExists.called).to.be.true;
    expect(remove.called).to.be.true;
    expect(writeYamlFile.called).to.be.true;
    expect(getYamlData.called).to.be.true;
    expect(hasParameter.called).to.be.true;
    expect(generateWrapper.called).to.be.true;
    expect(buildGoProject.called).to.be.true;
  });

  it("should throw an error for invalid function path format in updatePackageJson", async function () {
    const { updatePackageJson } = await esmock(
      "../src/doProjectConverter.mjs",
      {}
    );

    const invalidFunctionPath = "invalid/path";
    const jsonData = { name: "old-name" };

    expect(() => updatePackageJson(jsonData, invalidFunctionPath)).to.throw(
      "Invalid function path format"
    );
  });

  it("should throw an error for invalid function path format in updateYamlData", async function () {
    const { updateYamlData } = await esmock(
      "../src/doProjectConverter.mjs",
      {}
    );

    const invalidFunctionPath = "invalid/path";
    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "go:default" }],
        },
      ],
    };

    expect(() => updateYamlData(yamlData, invalidFunctionPath)).to.throw(
      "Invalid function path format"
    );
  });

  it("should throw an error if no Go functions are found in getDoGoFunction", async function () {
    const { getDoGoFunction } = await esmock(
      "../src/doProjectConverter.mjs",
      {}
    );

    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "nodejs:default" }],
        },
      ],
    };

    expect(() => getDoGoFunction(yamlData)).to.throw(
      "No Go function has been found in the Digital Ocean project provided"
    );
  });

  it("should return Go functions correctly in getDoGoFunction", async function () {
    const { getDoGoFunction } = await esmock(
      "../src/doProjectConverter.mjs",
      {}
    );

    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "go:default" }],
        },
      ],
    };

    const goFunctions = getDoGoFunction(yamlData);
    expect(goFunctions).to.be.an("array").that.is.not.empty;
  });

  it("should copy files correctly in copyDoPackages", async function () {
    const mocks = {
      "../src/utils/fileUtils.mjs": {
        listFoldersWithPrefix: sandbox
          .stub()
          .returns(["packages/package-name/function-name"]),
        copy: sandbox.stub().returns(true),
      },
    };

    const { copyDoPackages } = await esmock(
      "../src/doProjectConverter.mjs",
      mocks
    );

    copyDoPackages(do_go_dir, "/mock/tmpdir/copy-temp-1625158800000", [".env"]);

    expect(mocks["../src/utils/fileUtils.mjs"].listFoldersWithPrefix.called).to
      .be.true;
    expect(mocks["../src/utils/fileUtils.mjs"].copy.called).to.be.true;
  });

  it("should convert into Node.js package correctly in convertIntoNodeJSPackage", async function () {
    const mocks = {
      "../src/utils/fileUtils.mjs": {
        readJsonFile: sandbox.stub().returns({
          name: "do-js-wrapper",
          version: "1.0.0",
          main: "do-js-wrapper.js",
        }),
        writeJsonFile: sandbox.stub().returns(true),
        removeFolderContent: sandbox.stub().returns(true),
        copy: sandbox.stub().returns(true),
      },
      "../src/utils/yamlUtils.mjs": {
        hasParameter: sandbox.stub().returns(true),
      },
    };

    const module = await esmock("../src/doProjectConverter.mjs", mocks);

    const { convertIntoNodeJSPackage } = module;

    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "go:default" }],
        },
      ],
    };

    const updatedYamlData = convertIntoNodeJSPackage(
      yamlData,
      "/mock/tmpdir/copy-temp-1625158800000",
      "packages/package-name/function-name",
      "/compiled/path",
      "compiled_function"
    );

    expect(updatedYamlData).to.be.an("object");
    expect(mocks["../src/utils/fileUtils.mjs"].readJsonFile.called).to.be.true;
    expect(mocks["../src/utils/fileUtils.mjs"].writeJsonFile.called).to.be.true;
    expect(mocks["../src/utils/fileUtils.mjs"].removeFolderContent.called).to.be
      .true;
    expect(mocks["../src/utils/fileUtils.mjs"].copy.called).to.be.true;
  });

  it("should handle edge cases in convertDoGoProject function", async function () {
    // Set up test data and mocks
    const yamlData = {
      packages: [
        {
          name: "package-name",
          functions: [{ name: "function-name", runtime: "go:default" }],
        },
      ],
    };

    const yamlFilePath = path.resolve(argv.do_go_dir, argv.yaml_file);

    // Mock shallow dependencies
    const mocks = {
      "../src/utils/fileUtils.mjs": {
        readJsonFile: sandbox.stub().returns({
          name: "do-js-wrapper",
          version: "1.0.0",
          main: "do-js-wrapper.js",
          keywords: [],
          author: "DarkRockMountain",
          license: "MIT",
          description:
            "A Node.js wrapper for a DigitalOcean function in Go, overcoming Go limitations on DigitalOcean by building binaries locally with the latest version.",
          repository: {
            type: "git",
            url: "git+https://github.com/darkrockmountain/digitalocean-go-wrapper.git",
          },
          dependencies: {
            child_process: "^1.0.2",
          },
        }),
        writeJsonFile: sandbox.stub().returns(true),
        removeFolderContent: sandbox.stub().returns(true),
        copy: sandbox.stub().returns(true),
        listFoldersWithPrefix: sandbox
          .stub()
          .returns(["packages/package-name/function-name"]),
        checkDirExists: sandbox.stub().returns(true),
        remove: sandbox.stub().returns(true),
      },
      "../src/utils/yamlUtils.mjs": {
        writeYamlFile: sandbox.stub().returns(true),
        getYamlData: sandbox.stub().returns(yamlData),
        hasParameter: sandbox.stub().returns(true),
      },
      "../src/goWrapperGenerator.mjs": {
        generateWrapper: sandbox.stub().returns(true),
      },
      "../src/goBuilder.mjs": {
        buildGoProject: sandbox.stub().resolves("compiled_wrapper_path"),
      },
    };

    const doProjectConverter = await esmock("../src/doProjectConverter.mjs", mocks);

    // Call the default function (convertDoGoProject)
    await doProjectConverter.default(
      argv.do_go_dir,
      argv.do_project_output,
      argv.yaml_file,
      argv.go_built_name,
      argv.files_to_keep,
      true, // keep_wrapper
      argv.do_wrapper_output
    );

    // Assertions
    const { remove } = mocks["../src/utils/fileUtils.mjs"];
    expect(
      remove.calledWith(`${tmpdir}/copy-temp-${now}/${argv.do_wrapper_output}`)
    ).to.be.false; // Because keep_wrapper is true
  });
});
