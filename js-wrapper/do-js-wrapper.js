import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const errorOutputSeparator = "ERR: "

export async function main(event, context) {
  try {
    console.log('Function invoked');
    console.log(`Working directory: ${process.cwd()}`);
    console.log('Event:', JSON.stringify(event));
    console.log('Context:', JSON.stringify(context));
    
    const { stdout, stderr } = await execFileAsync(`./compiled_function`, [JSON.stringify(context), JSON.stringify(event)]);

    if (stderr) {
      console.log(stderr);
    }

    console.log(`Output: ${stdout}`);
    return {
      body: `${stdout}`,
      statusCode: stdout.startsWith(errorOutputSeparator) ? 500 :200,
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error('Execution failed:', error);
    return {
      body: `Execution failed`,
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    };
  }
};
