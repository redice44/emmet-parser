import tokenize from './tokenize';
import opperators from './ops';

var doc;

function parser(str, htmlDocument) {
  doc = htmlDocument || document;
  var tokens = tokenize(str);
  return makeNode(tokens);
}

/**
  Takes a queue of tokens and returns a node
*/
function makeNode(tokens) {
  var nodeStack = [];
  var token = null;
  var parent = null;
  var child = null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('Consuming Tokens');
  }

  if (process.env.DEBUG) {
    console.log('Tokens: ', tokens);
  }

  token = tokens.shift();
  // Evaluate the first node.
  if (isOp(token)) {
    if (token[0] === opperators.TEXT_START) {
      nodeStack.push(evaluateText(token));
    } else if(token[0] === opperators.GROUP_START) {
      tokens.unshift(token);
      nodeStack.push(evaluateGrouping(tokens));
    } else {
      throw new Error (`Invalid Syntax. Expected valid node. Cannot start with opperator ${token}.`);
    }
  } else {
    nodeStack.push(evaluateNode(token));
  }


  while (tokens.length > 0) {
    token = tokens.shift();

    if (process.env.DEBUG) {
      console.log('Stack', nodeStack);
      console.log('Tokens', tokens);
      console.log(`Token: ${token}`);
    }

    if (isOp(token)) {
      if (token[0] === opperators.GROUP_START) {
        tokens.unshift(token);
        nodeStack.push(evaluateGrouping(tokens));
      } else if (token[0] === opperators.TEXT_START) {
        parent = nodeStack.pop();

        if (!parent) {
          throw new Error (`Invalid Syntax. Text requires a parent.`);
        }

        nodeStack.push(evaluateChild(parent, evaluateText(token)));
      } else if (token[0] === opperators.MULTIPLY) {
        if (nodeStack.length === 0) {
          if (process.env.DEBUG) {
            console.log('Error in makeNode() isOp * branch. Node stack is empty.');
          }

          throw new Error (`Invalid Syntax. ${opperators.MULTIPLY} expects a valid node before it.`);
        }

        nodeStack.push(evaluateMultiply(nodeStack.pop(), token, tokens));
      } else if (token === opperators.PARENT) {
        if (nodeStack.length === 0) {
          throw new Error (`Invalid Syntax. ${opperators.PARENT} expects a valid node before it.`);
        }

        nodeStack.push(evaluateParent(tokens, nodeStack));
      } else if (token === opperators.SIBLING) {
        if (nodeStack.length === 0) {
          throw new Error (`Invalid Syntax. ${opperators.SIBLING} expects a valid node before it.`);
        }

        var first = nodeStack.pop();
        var second = tokens.shift();

        if (isOp(second)) {
          if (second !== opperators.GROUP_START) {
            throw new Error (`Invalid Syntax. ${opperators.SIBLING} expects a valid node after it. Found opperator: ${second}.`);
          }

          tokens.unshift(second);
          second = evaluateGrouping(tokens);
        } else {
          second = evaluateNode(second);
        }
        nodeStack.push(evaluateSibling(first, second));
      } else if (token === opperators.CHILD) {
        child = tokens.shift();

        if (isOp(child)) {
          if (child !== opperators.GROUP_START) {
            throw new Error (`Invalid Syntax. ${opperators.CHILD} expects a valid node after it. Found opperator: ${child}.`);
          }
          tokens.unshift(child);
          nodeStack.push(evaluateGrouping(tokens));
        } else {
          nodeStack.push(evaluateNode(child));
        }
      } else {
        throw new Error (`Unhandled Opperator: ${token}.`);
      }
    } else {
      // probably shouldn't ever get here on valid strings
      if (process.env.DEBUG) {
        console.log(`I don't think this should happen. Token: ${token}`);
      }

      throw new Error(`Expected Opperator but found ${token}.`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Finished Tokens');
  }

  if (process.env.DEBUG) {
    console.log('Node Stack: ', nodeStack);
  }

  evaluateStack(nodeStack);

  if (process.env.DEBUG) {
    console.log('Evaluated Node Stack', nodeStack[0]);
    console.log('');
  }

  return nodeStack.pop();
}

/**
  Mutates stack.
*/
function evaluateStack (stack) {
  var parent = null;
  var child = null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('Evaluating Stack');
  }

  if (process.env.DEBUG) {
    console.log('Stack: ', stack);
  }

  while (stack.length > 1) {
    child = stack.pop();
    parent = stack.pop();
    stack.push(evaluateChild(parent, child));
  }
}

/**
  @param {String} node - The string of the element to create.

  @return {DOM Node} - DOM Node representation of the string.
*/
function evaluateNode (node) {
  // Supported SVG Tags
  var svgTags = [
    'circle',
    'defs',
    'ellipse',
    'g',
    'line',
    'linearGradient',
    'mask',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'rect',
    'svg',
    'text'
  ];

  if (process.env.DEBUG) {
    console.log(`Evaluating node: ${node}`);
  }

  if (svgTags.includes(node)) {
    return doc.createElementNS("http://www.w3.org/2000/svg", node);
  }

  return doc.createElement(node);
}

function evaluateParent (tokens, nodeStack) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Evaluating Parent Op');
  }

  var depth = 1;

  while (tokens[0] === opperators.PARENT) {
    depth++;
    tokens.shift();
  }

  // Get a pointer to the first child.
  var children = nodeStack[nodeStack.length - 1];
  evaluateStack(nodeStack);
  var parent = nodeStack.pop();
  var target = children;

  if (process.env.DEBUG) {
    console.log('Parent:', parent);
    console.log('Child: ', children);
  }

  for (var i = 0; i <= depth; i++) {
    target = target.parentElement;
    if (!target) {
      if (process.env.DEBUG) {
        console.log(`Target: ${target}`);
        console.log(`Depth: ${depth}, Iteration: ${i}`);
      }

      throw new Error (`Invalid Syntax. Too many ${opperators.PARENT}.`);
    }
  }

  // Works because target is a pointer.
  evaluateChild(target, makeNode(tokens));
  return parent;
}

/**
  @param {DOM Node | DOM Node[]} parent - Soon to be parent(s).
  @param {DOM Node | DOM Node[]} child - Soon to be child(ren).

  @return {DOM Node | DOM Node[]} - The parent(s) with the child(ren). 
*/
function evaluateChild (parent, child) {
  if (process.env.DEBUG) {
    console.log('Evaluating Child');
    console.log('Parent: ', parent);
    console.log('Child: ', child);
  }

  var p = parent;

  if (parent instanceof Array) {
    p = parent[parent.length - 1];
  }


  if (child instanceof Array) {
    child.forEach(function (c) {
      p.appendChild(c);
    });
  } else {
    p.appendChild(child);
  }

  if (process.env.DEBUG) {
    console.log('Parent: ', parent);
  }

  // This works because p is a pointer.
  return parent;
}

/**
  @param {DOM Node | DOM Node []} first - The first child.
  @param {DOM Node | DOM Node []} second - The second child.

  @param {DOM Node[]} - Array of the combined children.
*/
function evaluateSibling (first, second) {
  if (process.env.DEBUG) {
    console.log('Evaluating Silbings');
    console.log('First', first);
    console.log('Second', second);
  }

  var result = [];

  if (first instanceof Array) {
    result = first;
  } else {
    result.push(first);
  }

  if (second instanceof Array) {
    second.forEach(function (node) {
      result.push(node);
    });
  } else {
    result.push(second);
  }

  return result;
}

/**  
  @param {DOM Node} target - The target DOM Node that will be multiplied.
  @param {String} token - The token with the GROUP_START symbol.
  @param {String[]} tokens - The rest of the tokens.

  @return {DOM Node} - The DOM Node structure that this grouping creates.
*/
function evaluateMultiply (target, token, tokens) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Evaluating Multiply');
  }

  if (process.env.DEBUG) {
    console.log('Tokens: ', tokens);
  }

  // Always an Int. Type checked during tokenizing.  
  var times = parseInt(token.split(' ')[1]);
  var result = [];
  var depth = 1;
  var grouping = [];
  var child = null;

  if (tokens[0] === opperators.CHILD) {
    var t = tokens.shift();

    while (tokens.length > 0 && !child) {
      t = tokens.shift();
      if (isOp(t)) {
        if (t === opperators.CHILD) {
          depth++;
        } else if (t === opperators.PARENT) {
          depth--;
          if (depth < 1) {
            // End and process the group. Put the ^ back in the tokens.
            // tokens.unshift(t);
            if (process.env.DEBUG) {
              console.log('Grouping: ', grouping);
            }
            // grouping.shift();
            child = makeNode(grouping);
          }
        }
      }

      if (!child) {
        grouping.push(t);
      }
    }
  }

  if (!child && grouping.length > 0) {
    child = makeNode(grouping);
  }

  if (child) {
    target.appendChild(child);
  }

  for (var i = 0; i < times; i++) {
    result.push(target.cloneNode(true));
  }

  return result;
}

/**
  @param {String} token - Token representing the text to create.

  @return {DOM Node} - DOM Text node for this string.
*/
function evaluateText (token) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Evaluating Text.');
  }

  if (process.env.DEBUG) {
    console.log(`Text: ${token}`);
  }

  return doc.createTextNode(token.substr(1, token.length - 2).trim());
}

/**
  @param {String} token - The token with the GROUP_START symbol.
  @param {String[]} tokens - The rest of the tokens.

  @return {DOM Node} - The DOM Node structure that this grouping creates.
*/
function evaluateGrouping (tokens) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting new grouping.');
  }

  var token = tokens.shift();
  var endIndex = tokens.findIndex(function (t) {
    return t.length > 0 && t[t.length - 1] === opperators.GROUP_END;
  });

  if (endIndex >= 0) {
    var groupedTokens = tokens.slice(0, endIndex);
    
    // Mutate the tokens to remove the grouping. 
    for (var i = 0; i <= endIndex; i++) {
      tokens.shift();
    }

    return makeNode(groupedTokens);
  }

  if (token[token.length - 1] === opperators.GROUP_END) {
    return makeNode([token.substr(1, token.length - 2)]);
  }

  if (process.env.DEBUG) {
    console.log(`No closing ) found.`, tokens);
  }

  throw new Error(`Invalid String. No closing ${opperators.GROUP_END}`);
}

/**
  @param {String} token - Token to check.

  @return {Boolean} - True: Token is an opperator.
*/
function isOp(token) {
  for (var op in opperators) {
    if (token === opperators[op] ||
        token.includes(opperators.MULTIPLY) ||
        token.includes(opperators.GROUP_START) ||
        token.includes(opperators.GROUP_END) ||
        token.includes(opperators.TEXT_START) ||
        token.includes(opperators.TEXT_END)) {

      return true;
    }
  }

  return false;
}

export default parser;
