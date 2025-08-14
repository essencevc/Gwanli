#!/usr/bin/env node

import { Command } from "commander";
import { auth } from "./auth.js";
import { index } from "./index.js";

const program = new Command("gwanli");

program
  .name("gwanli")
  .description("Gwanli - Notion management CLI")
  .version("0.2.0");

// Add auth command
program.addCommand(auth);

// Add index command
program.addCommand(index);

program.parse();
