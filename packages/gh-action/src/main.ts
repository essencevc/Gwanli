import * as core from "@actions/core";
import * as github from "@actions/github";

export async function run(): Promise<void> {
  try {
    const agent = core.getInput("agent");
    const model = core.getInput("model");
    const triggerWord = core.getInput("trigger-word");

    core.info(`Vibe All Coding: Activating ${agent} agent with model ${model}`);
    core.info(`Trigger word: ${triggerWord}`);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    core.info(`The event payload: ${payload}`);

    const result = `Vibe All Coding activated ${agent} agent with model ${model} and trigger word ${triggerWord}`;
    core.setOutput("result", result);
    core.info(result);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

if (require.main === module) {
  run();
}
