import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import yaml from "js-yaml";
import path from "path";

describe("YAML Utils Test", function () {
  let sandbox;
  let readUTF8FileStub;
  let writeUTF8FileStub;
  let listDirectoryContentsStub;

  let yamlUtils;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Generalize stubs
    readUTF8FileStub = sandbox.stub();
    writeUTF8FileStub = sandbox.stub();
    listDirectoryContentsStub = sandbox.stub();

    // Mock the fileUtils functions using esmock
    yamlUtils = await esmock(
      "../src/utils/yamlUtils.mjs",
      {
        "../src/utils/fileUtils.mjs": {
          readUTF8File: readUTF8FileStub,
          writeUTF8File: writeUTF8FileStub,
          listDirectoryContents: listDirectoryContentsStub,
        },
      }
    );
  });

  afterEach(() => {
    sandbox.restore();
    esmock.purge(yamlUtils);
  });

  describe("readProjectYaml", function () {
    it("should read and parse a YAML file", function () {
      const filePath = "test.yml";
      const fileContent = "key: value";
      readUTF8FileStub.returns(fileContent);
      sandbox.stub(yaml, "load").returns({ key: "value" });

      const result = yamlUtils.readProjectYaml(filePath);

      expect(result).to.deep.equal({ key: "value" });
      expect(readUTF8FileStub.calledWith(filePath)).to.be.true;
      expect(yaml.load.calledWith(fileContent)).to.be.true;
    });

    it("should throw an error if the YAML file cannot be read", function () {
      const filePath = "test.yml";
      readUTF8FileStub.throws(new Error("File read error"));

      expect(() => yamlUtils.readProjectYaml(filePath)).to.throw("File read error");
    });
  });

  describe("writeYamlFile", function () {
    it("should write data to a YAML file", function () {
      const filePath = "test.yml";
      const data = { key: "value" };
      const yamlContent = '"key": "value"\n';
      sandbox.stub(yaml, "dump").returns(yamlContent);

      yamlUtils.writeYamlFile(filePath, data);

      expect(writeUTF8FileStub.calledWith(filePath, yamlContent)).to.be.true;
      expect(yaml.dump.calledWith(data, { forceQuotes: true, quotingType: '"' })).to.be.true;
    });
  });

  describe("findYamlFiles", function () {
    it("should find all .yaml and .yml files in a directory", function () {
      const directoryPath = "testDir";
      const files = ["file1.yaml", "file2.yml", "file3.txt"];
      listDirectoryContentsStub.returns(files);

      const result = yamlUtils.findYamlFiles(directoryPath);

      expect(result).to.deep.equal(["file1.yaml", "file2.yml"]);
      expect(listDirectoryContentsStub.calledWith(directoryPath)).to.be.true;
    });
  });

  describe("getYamlData", function () {
    it("should read and parse the first YAML file found in a directory", function () {
      const directoryPath = "testDir";
      const yamlFiles = ["file1.yaml"];
      const yamlData = { key: "value" };
      listDirectoryContentsStub.returns(yamlFiles);
      readUTF8FileStub.returns("key: value");
      sandbox.stub(yaml, "load").returns(yamlData);

      const result = yamlUtils.getYamlData(directoryPath);

      expect(result).to.deep.equal(yamlData);
      expect(listDirectoryContentsStub.calledWith(directoryPath)).to.be.true;
      expect(readUTF8FileStub.calledWith(path.join(directoryPath, yamlFiles[0]))).to.be.true;
      expect(yaml.load.calledWith("key: value")).to.be.true;
    });

    it("should throw an error if no YAML files are found in the directory", function () {
      const directoryPath = "testDir";
      listDirectoryContentsStub.returns([]);

      expect(() => yamlUtils.getYamlData(directoryPath)).to.throw("Error .yml files found in the project");
    });
  });

  describe("hasParameter", function () {
    it("should return true if the parameter exists in the YAML content", function () {
      const yamlContent = { key: { nestedKey: "value" } };
      const parameter = "key.nestedKey";

      const result = yamlUtils.hasParameter(yamlContent, parameter);

      expect(result).to.be.true;
    });

    it("should return false if the parameter does not exist in the YAML content", function () {
      const yamlContent = { key: { nestedKey: "value" } };
      const parameter = "key.nonExistentKey";

      const result = yamlUtils.hasParameter(yamlContent, parameter);

      expect(result).to.be.false;
    });

    it("should handle edge cases for nested parameters", function () {
      const yamlContent = { key: null };
      const parameter = "key.nestedKey";

      const result = yamlUtils.hasParameter(yamlContent, parameter);

      expect(result).to.be.false;
    });
  });
});
