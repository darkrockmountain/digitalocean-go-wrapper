import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const defaultStartDelimiter = "<<<<<<<<<<<<<<<response<<<<<<<<<<<<<<<";
const defaultEndDelimiter = ">>>>>>>>>>>>>>>response>>>>>>>>>>>>>>>";

export async function main(event, context) {
  try {
    console.log("Function invoked");
    console.log(`Working directory: ${process.cwd()}`);
    console.log("Context:", JSON.stringify(context));
    console.log("Event:", JSON.stringify(event));

    const { stdout, stderr } = await execFileAsync(
      `./compiled_function`,
      [JSON.stringify(context), JSON.stringify(event)],
      {
        env: {
          ...process.env,
          START_DELIMITER: defaultStartDelimiter,
          END_DELIMITER: defaultEndDelimiter,
        },
      }
    );

    if (stderr) {
      console.log(`WrappedGoLog (stderr): ${stderr}`);
    }

    console.log(`WrappedGoLog (stdout): ${stdout}`);

    const startDelimiter = process.env.START_DELIMITER || defaultStartDelimiter;
    const endDelimiter = process.env.END_DELIMITER || defaultEndDelimiter;

    // Escape delimiters for use in regex
    const escapedStartDelimiter = startDelimiter.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
    const escapedEndDelimiter = endDelimiter.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    // Extract JSON between response markers
    const regex = new RegExp(
      `${escapedStartDelimiter}\\n([\\s\\S]*?)\\n${escapedEndDelimiter}`
    );
    const match = stdout.match(regex);

    if (match && match[1]) {
      const jsonResponse = JSON.parse(match[1]);
      console.log(`Extracted JSON: ${JSON.stringify(jsonResponse)}`);
      return {
        body: jsonResponse.body,
        statusCode: jsonResponse.statusCode,
        headers: jsonResponse.headers,
      };
    } else {
      console.log("No JSON found between response markers");
      return {
        body: "No valid JSON response found",
        statusCode: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      };
    }
  } catch (error) {
    console.error("Execution failed:", error.message);
    return {
      body: `Execution failed`,
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    };
  }
}
