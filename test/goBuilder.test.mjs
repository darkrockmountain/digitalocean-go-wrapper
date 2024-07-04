import * as chai from 'chai';
import sinon from "sinon";
import esmock from "esmock";
import path from "path";
import chaiAsPromised from "chai-as-promised";

// Configure Chai to use chai-as-promised
chai.use(chaiAsPromised);

// Then either:
const expect = chai.expect;

describe("Go Builder Script", function () {
  const GO_MOD_INIT_COMMAND = 'go mod init go-project';
  const GO_MOD_TIDY_COMMAND = 'go mod tidy';
  const GO_BUILD_COMMAND = 'go build -o';
  const goProjectPath = "test-dir";
  const builtName = "test-binary";
  const originalPWD = "/original/path";

  let execStub, existsStub, cwdStub, chdirStub;
  let buildGoProject;

  beforeEach(async () => {
    execStub = sinon.stub().callsFake((cmd, callback) => {
      if (cmd === GO_MOD_INIT_COMMAND) {
        callback(null, "", ""); // no error, empty stdout and stderr
      } else if (cmd === GO_MOD_TIDY_COMMAND) {
        callback(null, "", ""); // no error, empty stdout and stderr
      } else if (cmd.includes(`${GO_BUILD_COMMAND} ${builtName}`)) {
        callback(null, "", ""); // no error, empty stdout and stderr
      } else {
        callback(new Error("Command not recognized"), "", "");
      }
    });
    existsStub = sinon.stub();

    // Stubbing process.cwd() and process.chdir()
    cwdStub = sinon.stub(process, 'cwd').returns(originalPWD);
    chdirStub = sinon.stub(process, 'chdir');

    ({ buildGoProject } = await esmock("../src/goBuilder.mjs", {
      child_process: { exec: execStub },
      "../src/utils/fileUtils.mjs": {
        exists: existsStub,
      },
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("buildGoProject", function () {
    it("should build the Go project successfully", async function () {
      existsStub.withArgs("go.mod").returns(true);
      existsStub.withArgs(sinon.match((value) => value.endsWith(builtName))).returns(true);

      const result = await buildGoProject(goProjectPath, builtName);

      expect(execStub.calledWith(GO_MOD_TIDY_COMMAND)).to.be.true;
      expect(execStub.calledWith(sinon.match((value) => value.includes(`${GO_BUILD_COMMAND} ${builtName}`)))).to.be.true;
      expect(chdirStub.calledWith(goProjectPath)).to.be.true;
      expect(chdirStub.calledWith(originalPWD)).to.be.true;
      expect(result).to.equal(path.join(process.cwd(), builtName));
    });

    it("should throw an error if Go init fails", async function () {
      existsStub.withArgs("go.mod").returns(false);
      execStub.withArgs(GO_MOD_INIT_COMMAND).callsFake((cmd, callback) => {
        callback(new Error("Go mod init failed"), "", "Error: Go mod init failed");
      });

      await expect(buildGoProject(goProjectPath, builtName)).to.be.rejectedWith("Error: Go mod init failed");
    });

    it("should throw an error if Go tidy fails", async function () {
      existsStub.withArgs("go.mod").returns(true);
      execStub.withArgs(GO_MOD_TIDY_COMMAND).callsFake((cmd, callback) => {
        callback(new Error("Go mod tidy failed"), "", "Error: executing go mod tidy on the wrapper");
      });

      await expect(buildGoProject(goProjectPath, builtName)).to.be.rejectedWith("Error: executing go mod tidy on the wrapper");
    });

    it("should throw an error if Go build fails", async function () {
      existsStub.withArgs("go.mod").returns(true);
      execStub.withArgs(sinon.match((value) => value.includes(`${GO_BUILD_COMMAND} ${builtName}`))).callsFake((cmd, callback) => {
        callback(new Error("Go build failed"), "", "Error: Go build failed");
      });

      await expect(buildGoProject(goProjectPath, builtName)).to.be.rejectedWith("Error: Go build failed");
    });

    it("should throw an error if the compiled file is not found after build", async function () {
      existsStub.withArgs("go.mod").returns(true);
      execStub.withArgs(sinon.match((value) => value.includes(`${GO_BUILD_COMMAND} ${builtName}`))).callsFake((cmd, callback) => {
        callback(null, "", ""); // no error, empty stdout and stderr
      });
      existsStub.withArgs(sinon.match((value) => value.endsWith(builtName))).returns(false);

      await expect(buildGoProject(goProjectPath, builtName)).to.be.rejectedWith(`Error: Failure verifying existence of the compiled file at ${path.join(process.cwd(), builtName)}`);
    });
  });
});
