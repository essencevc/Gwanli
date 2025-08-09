export interface Tree {
  [key: string]: Tree | string;
}

export function extractSlugPrefix(prefix: string): {
  processedPrefix: string;
  shortenedPrefix: string;
} {
  const normalisedPrefix =
    prefix.trim().endsWith("/") && prefix !== "/"
      ? prefix.slice(0, -1)
      : prefix;

  const prefixComponents = normalisedPrefix.split("/");
  return {
    processedPrefix: normalisedPrefix,
    shortenedPrefix: prefixComponents.at(prefixComponents.length - 1) ?? "",
  };
}

export function buildTree(slugs: string[], maxDepth: number): Tree {
  const tree: Tree = {};
  for (const slug of slugs) {
    const parts = slug.split("/");

    let currDepth = 0;
    let currentTree = tree;

    for (const part of parts) {
      if (currDepth >= maxDepth) {
        currentTree[part] = "...";
        break;
      }

      if (currDepth == parts.length - 1) {
        // @ts-ignore
        currentTree[part] = null;
        break;
      }

      if (!currentTree[part]) {
        currentTree[part] = {};
      }
      currentTree = currentTree[part] as Tree;
      currDepth++;
    }
  }
  return tree;
}
