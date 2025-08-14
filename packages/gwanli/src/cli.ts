#!/usr/bin/env node

import { Command } from "commander";
import { indexNotionPages, listFiles } from "gwanli-core";
import { auth } from "./auth.js";

const program = new Command("gwanli");

program
  .name("gwanli")
  .description("Gwanli - Notion management CLI")
  .version("0.2.0");

// Add auth command
program.addCommand(auth);

program.parse();
