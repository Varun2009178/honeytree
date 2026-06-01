const TREE = `
       /\\
      /  \\
     /    \\
    /______\\
       ||
       ||
`;

const TREE_BLOSSOM = `
      .::.
    .:(@@):.
   :(@@@@@@):
    ':(@@):'
       ||
       ||
`;

export function asciiTree(hasBloomer) {
  return hasBloomer ? TREE_BLOSSOM : TREE;
}
