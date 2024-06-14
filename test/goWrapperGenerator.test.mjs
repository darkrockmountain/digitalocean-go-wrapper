import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";

describe("Go Wrapper Script", function () {
  let readUTF8FileStub, writeUTF8FileStub, listDirectoryContentsStub;
  let findGoFileWithFunction, createGoWrapper, extractMainFunctionInfo, getGoWrapperTemplate, generateWrapper;

  beforeEach(async () => {
    readUTF8FileStub = sinon.stub();
    writeUTF8FileStub = sinon.stub();
    listDirectoryContentsStub = sinon.stub();

    ({
      findGoFileWithFunction,
      createGoWrapper,
      extractMainFunctionInfo,
      getGoWrapperTemplate,
      generateWrapper,
    } = await esmock("../src/goWrapperGenerator.mjs", {
      "../src/utils/fileUtils.mjs": {
        readUTF8File: readUTF8FileStub,
        writeUTF8File: writeUTF8FileStub,
        listDirectoryContents: listDirectoryContentsStub,
      },
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("findGoFileWithFunction", function () {
    it("should find the Go file with the specified function", function () {
      const dirPath = "test-dir";
      const mainFunctionName = "mainFunction";
      const goFileName = "main.go";
      const goFileContent = "func mainFunction() {}";

      listDirectoryContentsStub.withArgs(dirPath).returns([goFileName]);
      readUTF8FileStub.withArgs(`${dirPath}/${goFileName}`).returns(goFileContent);

      const result = findGoFileWithFunction(dirPath, mainFunctionName);

      expect(result).to.equal(goFileName);
    });

    it("should return null if the function is not found", function () {
      const dirPath = "test-dir";
      const mainFunctionName = "mainFunction";
      const goFileName = "main.go";
      const goFileContent = "func anotherFunction() {}";

      listDirectoryContentsStub.withArgs(dirPath).returns([goFileName]);
      readUTF8FileStub.withArgs(`${dirPath}/${goFileName}`).returns(goFileContent);

      const result = findGoFileWithFunction(dirPath, mainFunctionName);

      expect(result).to.be.null;
    });
  });

  describe("extractMainFunctionInfo", function () {
    it("should extract the components of the Main function", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context, event Event) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(ctx, event.(Event))");
      expect(returns).to.equal("Response");
      expect(eventType).to.equal("Event");
    });

    it("should extract the components of the Main function with event as a map[string]string", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context, event map[string]string) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(ctx, event.(map[string]string))");
      expect(returns).to.equal("Response");
      expect(eventType).to.equal("map[string]string");
    });

    it("should extract the components of the Main function without params", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main() Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main()");
      expect(returns).to.contain("Response");
      expect(eventType).to.be.null;
    });

    it("should extract the components of the Main function with params in reverse order", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(event Event, ctx context.Context) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(event.(Event), ctx)");
      expect(returns).to.contain("Response");
      expect(eventType).to.equal("Event");
    });

    it("should extract the components of the Main function with only context param", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(ctx)");
      expect(returns).to.equal("Response");
      expect(eventType).to.be.null;
    });

    it("should extract the components of the Main function with only event param", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(event Event) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(event.(Event))");
      expect(returns).to.contain("Response");
      expect(eventType).to.equal("Event");
    });

    it("should extract the components of the main function with custom name", function () {
      const mainFuncName = "MyFunction";
      const mainFunc = `package main
      func MyFunction(ctx context.Context, event Event) Response {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("MyFunction(ctx, event.(Event))");
      expect(returns).to.equal("Response");
      expect(eventType).to.equal("Event");
    });

    it("should extract the components of the Main function without response", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context, event Event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("Main(ctx, event.(Event))");
      expect(returns).to.be.null;
      expect(eventType).to.equal("Event");
    });

    it("should extract the components of the main function with custom name without response", function () {
      const mainFuncName = "MyFunction";
      const mainFunc = `package main
      func MyFunction(ctx context.Context, event Event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const { functionCall, returns, eventType } = extractMainFunctionInfo(mainFunc, mainFuncName);

      expect(functionCall).to.equal("MyFunction(ctx, event.(Event))");
      expect(returns).to.be.null;
      expect(eventType).to.equal("Event");
    });

    it("should throw an error if function do not match names", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func MyFunction(ctx context.Context, event Event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      expect(() => extractMainFunctionInfo(mainFunc, mainFuncName)).to.throw(
        `Error: Function ${mainFuncName} not found in the Go source file.`
      );
    });

    it("should throw an error if function do not contains an event type", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context, event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      expect(() => extractMainFunctionInfo(mainFunc, mainFuncName)).to.throw(
        `Error: Event type not found in the params.`
      );
    });

    it("should throw an error if function has wrong parameters", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(ctx context.Context, event Event, illegalParam Event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      expect(() => extractMainFunctionInfo(mainFunc, mainFuncName)).to.throw(
        `Main function has wrong numbers of parameters. It can, at most, have the following optional params: one context.Context and one "Event" parameter (can be any type).`
      );
    });

    it("should throw an error if function has wrong parameters without context", function () {
      const mainFuncName = "Main";
      const mainFunc = `package main
      func Main(event Event, illegalParam Event) {
      return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      expect(() => extractMainFunctionInfo(mainFunc, mainFuncName)).to.throw(
        `Main function has wrong numbers of parameters. It can, at most, have the following optional params: one context.Context and one "Event" parameter (can be any type).`
      );
    });
  });

  describe("createGoWrapper", function () {
    it("should create the Go wrapper function when Main() is called", function () {
      const goWrapperTemplate = `package main
      func mainFunctionWrapper() {
        panic("mainFunctionWrapper not implemented")
      }`;
      readUTF8FileStub.withArgs(sinon.match.string).returns(goWrapperTemplate);

      const mainFuncCode = `package main
      func Main() Response {
        return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const result = createGoWrapper(mainFuncCode, "Main");

      expect(result).to.contain("resp := Main()");
      expect(result).to.contain("handleResponse(resp)");
    });

    it("should create the Go wrapper function with parameters", function () {
      const goWrapperTemplate = `package main
      func mainFunctionWrapper() {
        panic("mainFunctionWrapper not implemented")
      }`;
      readUTF8FileStub.withArgs(sinon.match.string).returns(goWrapperTemplate);

      const mainFuncCode = `package main
      func Main(ctx context.Context, event Event) Response {
        return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const result = createGoWrapper(mainFuncCode, "Main");

      expect(result).to.contain("resp := Main(ctx, event.(Event))");
      expect(result).to.contain("handleResponse(resp)");
    });

    it("should create the Go wrapper function with custom main function name", function () {
      const goWrapperTemplate = `package main
      func mainFunctionWrapper() {
        panic("mainFunctionWrapper not implemented")
      }`;
      readUTF8FileStub.withArgs(sinon.match.string).returns(goWrapperTemplate);

      const mainFuncCode = `package main
      func MyFunction(ctx context.Context, event Event) Response {
        return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const result = createGoWrapper(mainFuncCode, "MyFunction");

      expect(result).to.contain("resp := MyFunction(ctx, event.(Event))");
      expect(result).to.contain("handleResponse(resp)");
    });

    it("should create the Go wrapper function when Main() has no return", function () {
      const goWrapperTemplate = `package main
      func mainFunctionWrapper() {
        panic("mainFunctionWrapper not implemented")
      }`;
      readUTF8FileStub.withArgs(sinon.match.string).returns(goWrapperTemplate);

      const mainFuncCode = `package main
      func Main(ctx context.Context, event Event) {
        return generateResponse(http.StatusOK, "Executed successfully")
      }`;

      const result = createGoWrapper(mainFuncCode, "Main");

      expect(result).to.contain("Main(ctx, event.(Event))");
      expect(result).to.contain("handleResponse(nil)");
    });
  });

  describe("generateWrapper", function () {
    it("should generate a Go wrapper successfully", function () {
      const mockDirPath = "/mock/dir";
      const mockFunctionName = "mockFunction";
      const mockFileName = "main.go";
      const mockSourceCode = `package main\n func ${mockFunctionName}(){}`;
      const mockWrapperCode = "mock wrapper code";

      listDirectoryContentsStub.withArgs(mockDirPath).returns([mockFileName]);
      readUTF8FileStub.withArgs(`${mockDirPath}/${mockFileName}`).returns(mockSourceCode);
      readUTF8FileStub.withArgs( sinon.match((value) =>
        value.endsWith("go-wrapper/do-main-wrapper.go")
      )).returns(mockWrapperCode);

      generateWrapper(mockDirPath, mockFunctionName);

      expect(readUTF8FileStub.called).to.be.true;
      expect(writeUTF8FileStub.calledWith(`${mockDirPath}/do_go_wrapper.go`, mockWrapperCode)).to.be.true;
    });

    it("should throw an error if the main function is not found", function () {
      const mockDirPath = "/mock/dir";
      const mockFunctionName = "mockFunction";

      listDirectoryContentsStub.withArgs(mockDirPath).returns([]);

      expect(() => generateWrapper(mockDirPath, mockFunctionName)).to.throw(
        `Main function ${mockFunctionName} not found in any Go source files.`
      );
    });
  });
});
