import * as chai from "chai";
import sinon, { createSandbox } from "sinon";
import esmock from "esmock";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

describe("do-js-wrapper main", () => {
  let sandbox;
  let main;
  let execFileAsyncMock;
  let originalConsoleLog;
  let originalConsoleError;
  let consoleLogSpy;
  let consoleErrorSpy;

  before(async () => {
    sandbox = createSandbox();
    execFileAsyncMock = sandbox.stub();

    main = await esmock("../../../js-wrapper/do-js-wrapper.js", {
      child_process: {
        execFile: (cmd, args, callback) =>
          execFileAsyncMock(cmd, args)
            .then((result) => callback(null, result.stdout, result.stderr))
            .catch((err) => callback(err)),
      },
      util: {
        promisify: () => execFileAsyncMock,
      },
    }).then((module) => module.main);
  });

  beforeEach(() => {
    // Suppress console.log and console.error
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    consoleLogSpy = sandbox.spy();
    consoleErrorSpy = sandbox.spy();
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;
  });

  afterEach(() => {
    sandbox.restore();
    // Restore console.log and console.error
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it("should execute successfully with correct stdout and no stderr", async () => {
    execFileAsyncMock.resolves({ stdout: `<<<<<<<<<<<<<<<response<<<<<<<<<<<<<<<
{
  "body": "Success output",
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  }
}
>>>>>>>>>>>>>>>response>>>>>>>>>>>>>>>>
`, stderr: "" });

    const event = { key: "value" };
    const context = { contextKey: "contextValue" };

    const result = await main(event, context);

    chai.expect(result).to.deep.equal({
      body: "Success output",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  it("should return 500 status code when stdout starts with error output separator", async () => {
    execFileAsyncMock.resolves({
      stdout: "",
      stderr: "Some error occurred",
    });

    const event = { key: "value" };
    const context = { contextKey: "contextValue" };

    const result = await main(event, context);

    chai.expect(result).to.deep.equal({
      body: "No valid JSON response found",
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  });

  it("should log stderr output if present", async () => {
    const errorOutput = "Some error in stderr"
    execFileAsyncMock.resolves({
      stdout: `<<<<<<<<<<<<<<<response<<<<<<<<<<<<<<<
{
  "body": "Success output",
  "statusCode": 200,
  "headers": {
    "Content-Type": "text/plain"
  }
}
>>>>>>>>>>>>>>>response>>>>>>>>>>>>>>>>
`,
      stderr: errorOutput,
    });

    const event = { key: "value" };
    const context = { contextKey: "contextValue" };

    const result = await main(event, context);

    chai.expect(result).to.deep.equal({
      body: "Success output",
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    }); 
    chai.expect(consoleLogSpy.calledWith(`WrappedGoLog (stderr): ${errorOutput}`)).to.be.true;
  });

  it("should handle execution failure and return 500 status code", async () => {
    const executionError = new Error("Execution failed");
    execFileAsyncMock.rejects(executionError);

    const event = { key: "value" };
    const context = { contextKey: "contextValue" };

    const result = await main(event, context);

    chai.expect(result).to.deep.equal({
      body: "Execution failed",
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
    chai.expect(consoleErrorSpy.called).to.be.true;
    chai.expect(consoleErrorSpy.calledWith("Execution failed:", executionError.message))
      .to.be.true;
  });

  it("should log function invocation and working directory", async () => {
    execFileAsyncMock.resolves({ stdout: "Success output", stderr: "" });

    const event = { key: "value" };
    const context = { contextKey: "contextValue" };

    await main(event, context);

    chai.expect(consoleLogSpy.calledWith("Function invoked")).to.be.true;
    chai.expect(consoleLogSpy.calledWith(`Working directory: ${process.cwd()}`))
      .to.be.true;
    chai.expect(consoleLogSpy.calledWith("Event:", JSON.stringify(event))).to.be
      .true;
    chai.expect(consoleLogSpy.calledWith("Context:", JSON.stringify(context)))
      .to.be.true;
  });
});
