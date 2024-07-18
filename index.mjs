#!/usr/bin/env node
import { runCLI } from './src/cli.mjs';

await runCLI(process.argv.slice(2));