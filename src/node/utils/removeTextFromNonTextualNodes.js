const visit = require('unist-util-visit');

const NON_TEXTUAL_NODES = ['ul', 'ol']

module.exports = options => tree => {
  visit(tree, isNonTextualNode, removeText);
};

const isNonTextualNode = (node) =>  NON_TEXTUAL_NODES.includes(node.tagName);

const removeText = (node) => {
  const textNode = node.children.find(n => n.type === 'text');
  if (!textNode) return;
  textNode.value = '';
}
