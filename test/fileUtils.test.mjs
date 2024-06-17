import { expect } from "chai";
import sinon from "sinon";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import os from "os";
import {
  readUTF8File,
  writeUTF8File,
  readJsonFile,
  writeJsonFile,
  removeFolderContent,
  copy,
  checkDirExists,
  remove,
  exists,
  listFoldersWithPrefix,
  listDirectoryContents,
} from "../src/utils/fileUtils.mjs";

describe("File Utils test", function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("readUTF8File", function () {
    it("should read a file in UTF-8 encoding", function () {
      const filePath = "test.txt";
      const fileContent = "Hello, World!";
      sandbox.stub(fs, "readFileSync").returns(fileContent);

      const result = readUTF8File(filePath);

      expect(result).to.equal(fileContent);
      expect(fs.readFileSync.calledWith(filePath, "utf8")).to.be.true;
    });
  });

  describe("writeUTF8File", function () {
    it("should write content to a file with UTF-8 encoding", function () {
      const filePath = "test.txt";
      const content = "Hello, World!";
      const writeFileSyncStub = sandbox.stub(fs, "writeFileSync");

      writeUTF8File(filePath, content);

      expect(writeFileSyncStub.calledWith(filePath, content, "utf8")).to.be.true;
    });
  });

  describe("readJsonFile", function () {
    it("should read and parse a JSON file", function () {
      const filePath = "test.json";
      const fileContent = '{"key": "value"}';
      sandbox.stub(fs, "readFileSync").returns(fileContent);

      const result = readJsonFile(filePath);

      expect(result).to.deep.equal({ key: "value" });
      expect(fs.readFileSync.calledWith(filePath, "utf8")).to.be.true;
    });

    it("should throw an error if JSON is invalid", function () {
      const filePath = "test.json";
      const fileContent = '{"key": "value"';
      sandbox.stub(fs, "readFileSync").returns(fileContent);

      expect(() => readJsonFile(filePath)).to.throw(SyntaxError);
    });
  });

  describe("writeJsonFile", function () {
    it("should write data to a JSON file", function () {
      const filePath = "test.json";
      const data = { key: "value" };
      const jsonContent = JSON.stringify(data, null, 2);
      const writeFileSyncStub = sandbox.stub(fs, "writeFileSync");

      writeJsonFile(filePath, data);

      expect(writeFileSyncStub.calledWith(filePath, jsonContent, "utf8")).to.be.true;
    });
  });

  describe('removeFolderContent', () => {
    let testDir;
  
    beforeEach(() => {
      // Create a temporary directory for testing
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testDir-'));
  
      // Create some files and directories inside the test directory
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'content2');
      fs.mkdirSync(path.join(testDir, 'subdir'));
      fs.writeFileSync(path.join(testDir, 'subdir', 'file3.txt'), 'content3');
    });
  
    afterEach(() => {
      // Remove the test directory after each test
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  
    it('should remove all files and directories except the specified ones', () => {
      const keepFiles = ['file1.txt', 'subdir'];
  
      removeFolderContent(testDir, keepFiles);
  
      // Check that file1.txt and subdir still exist
      expect(fs.existsSync(path.join(testDir, 'file1.txt'))).to.be.true;
      expect(fs.existsSync(path.join(testDir, 'subdir'))).to.be.true;
  
      // Check that file2.txt and subdir/file3.txt have been removed
      expect(fs.existsSync(path.join(testDir, 'file2.txt'))).to.be.false;
    });
  
    it('should remove all files and directories if keepFiles is empty', () => {
      removeFolderContent(testDir);
  
      // Check that the directory is empty
      const remainingFiles = fs.readdirSync(testDir);
      expect(remainingFiles).to.be.empty;
    });
  
    it('should not fail if the folder is already empty', () => {
      // Clear the test directory manually
      fs.readdirSync(testDir).forEach((file) => {
        const fullPath = path.join(testDir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
          fs.rmdirSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      });
  
      removeFolderContent(testDir);
  
      // Check that the directory is still empty
      const remainingFiles = fs.readdirSync(testDir);
      expect(remainingFiles).to.be.empty;
    });
  });


  describe("copy", function () {
    it("should copy contents from source to destination", function () {
      const sourceDir = "source";
      const destinationDir = "destination";
      const copySyncStub = sandbox.stub(fsExtra, "copySync");

      copy(sourceDir, destinationDir);

      expect(copySyncStub.calledWith(sourceDir, destinationDir)).to.be.true;
    });
  });

  describe("checkDirExists", function () {
    it("should ensure a directory exists", function () {
      const dirPath = "testDir";
      const ensureDirSyncStub = sandbox.stub(fsExtra, "ensureDirSync");

      checkDirExists(dirPath);

      expect(ensureDirSyncStub.calledWith(dirPath)).to.be.true;
    });
  });

  describe("remove", function () {
    it("should remove a file or directory", function () {
      const filePath = "testFile.txt";
      const removeSyncStub = sandbox.stub(fsExtra, "removeSync");

      remove(filePath);

      expect(removeSyncStub.calledWith(filePath)).to.be.true;
    });
  });

  describe("exists", function () {
    it("should return true if a file or directory exists", function () {
      const filePath = "testFile.txt";
      sandbox.stub(fs, "existsSync").returns(true);

      const result = exists(filePath);

      expect(result).to.be.true;
      expect(fs.existsSync.calledWith(filePath)).to.be.true;
    });

    it("should return false if a file or directory does not exist", function () {
      const filePath = "testFile.txt";
      sandbox.stub(fs, "existsSync").returns(false);

      const result = exists(filePath);

      expect(result).to.be.false;
      expect(fs.existsSync.calledWith(filePath)).to.be.true;
    });
  });

  describe("listFoldersWithPrefix", function () {
    it("should list all folders starting with a specific prefix", function () {
      const basePath = "testBasePath";
      const prefix = "test";
      const folders = ["testFolder1", "testFolder2"];
      sandbox.stub(fs, "readdirSync").callsFake((fullPath) => {
        if (folders.some(folder => fullPath.includes(folder))){
          return []
        }
        return folders;
      });
      sandbox.stub(fs, "lstatSync").returns({ isDirectory: () => true });

      const result = listFoldersWithPrefix(basePath, prefix);

      expect(result).to.deep.equal([path.join(path.resolve(basePath), "testFolder1"), path.join(path.resolve(basePath), "testFolder2")]);
    });
  });

  describe("listDirectoryContents", function () {
    it("should list the contents of a directory", function () {
      const dirPath = "testDir";
      const contents = ["file1.txt", "file2.txt"];
      sandbox.stub(fs, "readdirSync").returns(contents);

      const result = listDirectoryContents(dirPath);

      expect(result).to.deep.equal(contents);
      expect(fs.readdirSync.calledWith(dirPath)).to.be.true;
    });
  });
});
