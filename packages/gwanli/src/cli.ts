#!/usr/bin/env node

import { Command } from 'commander'
import { helloGwanli } from 'gwanli-core'

const program = new Command('gwanli')

program
  .name('gwanli')
  .description('Gwanli - Notion management CLI')
  .version('0.1.0')

program
  .command('hello')
  .description('Say hello from Gwanli')
  .action(() => {
    console.log(helloGwanli())
  })

program.parse()
