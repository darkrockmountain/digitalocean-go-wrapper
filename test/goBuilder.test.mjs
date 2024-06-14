import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import path from "path";

describe("Go Builder Script", function () {
  const GO_MOD_INIT_COMMAND = "go mod init go-project";
  const GO_MOD_TIDY_COMMAND = "go mod tidy";
  const GO_BUILD_COMMAND = "go build -o";
  const goProjectPath = "test-dir";
  const builtName = "test-binary";
  const originalPWD = "/original/path";

  let shellStub, existsStub;
  let buildGoProject;

  beforeEach(async () => {
    shellStub = {
      pwd: sinon.stub().returns({ stdout: originalPWD }),
      cd: sinon.stub(),
      exec: sinon.stub().returns({ code: 0 }),
    };
    existsStub = sinon.stub();

    ({ buildGoProject } = await esmock("../src/goBuilder.mjs", {
      shelljs: shellStub,
      "../src/utils/fileUtils.mjs": {
        exists: existsStub,
      },
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("buildGoProject", function () {
    it("should build the Go project successfully", function () {
      existsStub.withArgs("go.mod").returns(true);
      existsStub.withArgs(sinon.match((value) => value.endsWith(builtName))).returns(true);

      const result = buildGoProject(goProjectPath, builtName);

      expect(shellStub.cd.calledWith(goProjectPath)).to.be.true;
      expect(shellStub.exec.calledWith(GO_MOD_INIT_COMMAND)).to.be.false;
      expect(shellStub.exec.calledWith(GO_MOD_TIDY_COMMAND)).to.be.true;
      expect(shellStub.exec.calledWith(sinon.match((value) => value.endsWith(`${GO_BUILD_COMMAND} ${builtName}`)))).to.be.true;
      expect(shellStub.cd.calledWith(originalPWD)).to.be.true;
      expect(result).to.equal(path.join(originalPWD, builtName));
    });

    it("should throw an error if Go init fails", function () {
      existsStub.withArgs("go.mod").returns(false);
      shellStub.exec.withArgs(GO_MOD_INIT_COMMAND).returns({ code: 1 });

      expect(() => buildGoProject(goProjectPath, builtName)).to.throw("Error: Go mod init failed");
    });

    it("should throw an error if Go tidy fails", function () {
      existsStub.withArgs("go.mod").returns(true);
      shellStub.exec.withArgs(GO_MOD_TIDY_COMMAND).returns({ code: 1 });

      expect(() => buildGoProject(goProjectPath, builtName)).to.throw("Error: executing go mod tidy on the wrapper");
    });

    it("should throw an error if Go build fails", function () {
      existsStub.withArgs("go.mod").returns(true);
      shellStub.exec.withArgs(sinon.match((value) => value.endsWith(`${GO_BUILD_COMMAND} ${builtName}`))).returns({ code: 1 });

      expect(() => buildGoProject(goProjectPath, builtName)).to.throw("Error: Go build failed");
    });

    it("should throw an error if the compiled file is not found after build", function () {
      existsStub.withArgs("go.mod").returns(true);
      existsStub.withArgs(sinon.match((value) => value.endsWith(builtName))).returns(false);

      expect(() => buildGoProject(goProjectPath, builtName)).to.throw(`Error: Failure verifying existence of the compiled file at ${path.join(originalPWD, builtName)}`);
    });
  });
});
