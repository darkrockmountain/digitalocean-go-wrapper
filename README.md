<div align="center">
<br/>
<br/>
<img src="assets/dogo-logo.jpg" alt="Logo" width="360" />
<br/>
<br/>
</div>

# DoGo-Wrapper | DigitalOcean Go Serverless Wrapper

![Build Status](https://github.com/DarkRockMountain/digitalocean-go-wrapper/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/DarkRockMountain/digitalocean-go-wrapper/graph/badge.svg?token=4S8BIA29OB)](https://codecov.io/gh/DarkRockMountain/digitalocean-go-wrapper)
![License](https://img.shields.io/github/license/DarkRockMountain/digitalocean-go-wrapper)
![node Version](https://img.shields.io/node/v/digitalocean-go-wrapper?kill_cache=1)
![npm version](https://img.shields.io/npm/v/digitalocean-go-wrapper?kill_cache=1)
[![GitHub Release](https://img.shields.io/github/v/release/darkrockmountain/digitalocean-go-wrapper)](https://github.com/darkrockmountain/digitalocean-go-wrapper/releases)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/DarkRockMountain/digitalocean-go-wrapper/badge)](https://scorecard.dev/viewer/?uri=github.com/DarkRockMountain/digitalocean-go-wrapper)
[![Go Report Card](https://goreportcard.com/badge/github.com/darkrockmountain/digitalocean-go-wrapper?branch=master&kill_cache=1)](https://goreportcard.com/report/github.com/darkrockmountain/digitalocean-go-wrapper)
<!-- ![Dependencies](https://img.shields.io/librariesio/github/DarkRockMountain/digitalocean-go-wrapper) -->
<!-- ![Repo Size](https://img.shields.io/github/repo-size/DarkRockMountain/digitalocean-go-wrapper) -->
<!-- ![npm downloads](https://img.shields.io/npm/dm/digitalocean-go-wrapper) -->


DoGo-Wrapper is a Node.js package that simplifies deploying Go functions on DigitalOcean. It overcomes Go's limitations on DigitalOcean by building binaries locally using the latest version. Easily convert your Go projects into deployable Node.js packages and deploy them to DigitalOcean with minimal effort.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Deploying to DigitalOcean](#deploying-to-digitalocean)
- [License](#license)
- [Links](#links)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm are installed.
- Go is installed and configured.
- DigitalOcean CLI (optional, for deployment to DigitalOcean).

## Installation

To install the package globally via npm:

```bash
npm install -g digitalocean-go-wrapper
```

## Usage

To wrap a Go function and convert it into a Node.js package, use the following command:

```bash
dogo-wrap --do_go_dir <path_to_go_project> --do_project_output <output_directory>
```

For more options, use the `--help` command:
```bash
dogo-wrap --help
```
or
```bash
man dogo-wrap
```

### Command Line Arguments

- `--do_go_dir` or `-d`: Directory containing the Go files (default: `./`).
- `--do_project_output`, `--out` or `-o`: Output directory for the wrapped project (default: `./do_wrapped_function/`).

## Commands

### Build Go Project

The script will automatically initialize, tidy, and build the Go project. The built binary will be placed in the specified output directory.

### Convert to Node.js Package

The Go function is wrapped in a Node.js package using our tested DigitalOcean template. The necessary files and dependencies are copied and updated accordingly.

## Deploying to DigitalOcean

Once you have executed the `dogo-wrap` command and the project is wrapped, you can deploy your function to DigitalOcean with the following command:

```bash
doctl serverless deploy <output_directory>
```
## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Links
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Changelog

See the [CHANGELOG.md](CHANGELOG.md) file for details on updates and changes.

