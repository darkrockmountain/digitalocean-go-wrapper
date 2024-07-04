# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Introduced `--help` command to the CLI to display usage information.
- Added the `engines` field to `package.json` to specify required Node.js and npm versions.
- New documentation for the CLI options and usage in the `README.md`.
- Added `preferGlobal` field to `package.json` for backward compatibility.
- Added `child_process` for shell command execution, replacing `shelljs`.

### Changed
- Replaced all instances of `shelljs` with `child_process` to improve performance and maintainability.
- Updated tests to reflect the changes in shell command execution.
- Cleaned up the bin configuration in `package.json`.


## [0.1.0] - 2024-06-14

### Added
- Initial release of the `digitalocean-go-wrapper` package.
- Core functionality for wrapping DigitalOcean functions in Go.
- Basic command-line interface (CLI) for project conversion.
- Comprehensive tests for all functionalities.

---

