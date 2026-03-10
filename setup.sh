#!/bin/bash
# Cipi setup — fetches and runs the official installer
set -e
curl -fsSL https://raw.githubusercontent.com/cipi-sh/cipi/refs/heads/latest/setup.sh | bash
