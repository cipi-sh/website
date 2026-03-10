#!/bin/bash
# Cipi setup — fetches and runs the official installer
# https://cipi.sh (short URL: go.sh)
set -e
curl -fsSL https://raw.githubusercontent.com/cipi-sh/cipi/refs/heads/latest/setup.sh | bash
