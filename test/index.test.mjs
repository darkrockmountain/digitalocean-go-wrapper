import { expect } from "chai";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

import packageJson from "../package.json" assert { type: "json" };

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CLI entry point
const cliPath = path.resolve(__dirname, "../index.mjs");

describe("Index", function () {
  it("should display help message with --help", function (done) {
    exec(`node ${cliPath} --help`, (error, stdout, stderr) => {
      if (error) {
        return done(error);
      }
      expect(stdout).to.include("Usage:");
      expect(stdout).to.include("-h, --help");
      expect(stdout).to.include("-o, --out");
      expect(stdout).to.include("--do_wrapper_output");
      done();
    });
  });

  it("should display version with --version", function (done) {
    exec(`node ${cliPath} --version`, (error, stdout, stderr) => {
      if (error) {
        return done(error);
      }
      expect(stdout.trim()).to.equal(
        `${packageJson.name} version ${packageJson.version}`
      );
      done();
    });
  });
});
