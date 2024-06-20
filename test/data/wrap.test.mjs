import { runCLI } from "../../src/cli.mjs";
import { fileURLToPath } from "url";
import path from "path";
import { DEFAULT_DO_WRAPPER_OUTPUT } from "../../src/doProjectConverter.mjs";
import { execFile } from "child_process";
import * as chai from "chai";
import fsExtra from "fs-extra";

import chaiAsPromised from "chai-as-promised";

// Configure Chai to use chai-as-promised
chai.use(chaiAsPromised);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exampleDOFunction = `packages/test/function/`;
const outputWrapper = `builtWrapperTest`;

const do_wrapper_output_path = path.resolve(__dirname, "digitalocean_wrapped/");
const do_wrapper_compiled_exec = path.resolve(
  do_wrapper_output_path,
  DEFAULT_DO_WRAPPER_OUTPUT,
  exampleDOFunction,
  outputWrapper
);

async function buildGoProject(folderName) {
  const do_func_path = path.resolve(__dirname, folderName);
  console.log(`do_func_path ${do_func_path}`);
  await runCLI([
    "--do_go_dir",
    do_func_path,
    "--do_project_output",
    do_wrapper_output_path,
    "--keep_wrapper",
    "--go_built_name",
    outputWrapper,
  ]);
}

function executeWrapper(args) {
  return new Promise((resolve, reject) => {
    execFile(do_wrapper_compiled_exec, args, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout + stderr);
      }
    });
  });
}

const withScenario = describe;

describe("CLI", function () {
  this.timeout(10000); // Set the timeout for the entire suite to 10 seconds

  withScenario("Function with Event as byte array", function () {
    this.beforeAll(async function () {
      await buildGoProject("digitalocean_functions_event_bytes");
    });

    this.afterAll(() => {
      fsExtra.removeSync(do_wrapper_output_path);
    });

    it("should run without any issues", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = {
        text: "text",
        boolean: true,
        integer: 123456789,
      };

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      const expectedOutput = `Executed successfully with ctx: ${JSON.stringify(
        ctxArgs
      )}, event: ${JSON.stringify(eventArgs)}`;

      await chai
        .expect(output.then((o) => o.trim()))
        .to.eventually.include(expectedOutput.trim());
    });

    it("should return an error if the event arguments are not a json", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = `{
          text: "text",
          boolean: true,
          integer: 123456789,
        }`;

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      const expectedOutput = `cannot unmarshal string into Go value of type map[string]interface`;

      await chai
        .expect(output.then((o) => o.trim()))
        .to.eventually.include(expectedOutput.trim());
    });
  });

  withScenario("Function with Event as struct", function () {
    this.beforeAll(async function () {
      await buildGoProject("digitalocean_functions_event_struct");
    });

    this.afterAll(() => {
      fsExtra.removeSync(do_wrapper_output_path);
    });

    it("should run without any issues", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = {
        text: "text",
        boolean: true,
        integer: 123456789,
      };

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      const expectedOutput = `Executed successfully with ctx: ${JSON.stringify(
        ctxArgs
      )}, event: ${JSON.stringify(eventArgs)}`;

      await chai
        .expect(output.then((o) => o.trim()))
        .to.eventually.include(expectedOutput.trim());
    });

    it("should return an error if the event arguments are not a json", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = `{
          text: "text",
          boolean: true,
          integer: 123456789,
        }`;

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      await chai.expect(output).to.be.rejectedWith(/Invalid event argument/);
      await chai
        .expect(output)
        .to.be.rejectedWith(
          /cannot unmarshal string into Go value of type main.CustomInput/
        );
    });

    it("should return an error if the event arguments are not as the ones expected", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = {
        text: "text",
        boolean: "true", //this should be a boolean
        integer: 123456789,
      };

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = new Promise((resolve, reject) => {
        execFile(do_wrapper_compiled_exec, args, (error, stdout, stderr) => {
          if (error) {
            reject(`Failed to run main.go: ${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      });

      await chai.expect(output).to.be.rejectedWith(/Invalid event argument/);
      await chai
        .expect(output)
        .to.be.rejectedWith(
          /cannot unmarshal string into Go struct field CustomInput.boolean of type bool/
        );
    });
  });

  withScenario("Function with No Context", function () {
    this.beforeAll(async function () {
      await buildGoProject("digitalocean_functions_event_struct_no_ctx");
    });

    this.afterAll(() => {
      fsExtra.removeSync(do_wrapper_output_path);
    });

    it("should run without any issues", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = {
        text: "text",
        boolean: true,
        integer: 123456789,
      };

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      const expectedOutput = `Executed successfully with ctx: ${""}, event: ${JSON.stringify(
        eventArgs
      )}`;

      await chai
        .expect(output.then((o) => o.trim()))
        .to.eventually.include(expectedOutput.trim());
    });
  });

  withScenario("Function with No Event", function () {
    this.beforeAll(async function () {
      await buildGoProject("digitalocean_functions_no_event");
    });

    this.afterAll(() => {
      fsExtra.removeSync(do_wrapper_output_path);
    });

    it("should run without any issues", async function () {
      // Run the main.go program
      const ctxArgs = {
        activation_id: "12345",
        api_host: "api.example.com",
        api_key: "your_api_key",
        function_name: "your_function_name",
        function_version: "1.0",
        namespace: "your_namespace",
        request_id: "request_123",
      };

      const eventArgs = {
        text: "text",
        boolean: true,
        integer: 123456789,
      };

      const args = [JSON.stringify(ctxArgs), JSON.stringify(eventArgs)];

      const output = executeWrapper(args);

      const expectedOutput = `Executed successfully with ctx: ${JSON.stringify(
        ctxArgs
      )}, event: ${""}`;

      await chai
        .expect(output.then((o) => o.trim()))
        .to.eventually.include(expectedOutput.trim());
    });
  });
});
