#!/usr/bin/env node

import { main } from '../src/main.js';

const ascii = process.argv.includes('--ascii');
main(ascii);
