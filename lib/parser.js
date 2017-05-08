var opperators = {
  GROUP_START: '(',
  GROUP_END: ')',
  TEXT_START: '{',
  TEXT_END: '}',
  MULTIPLY: '*',
  CHILD: '>',
  SIBLING: '+',
  PARENT: '^'
};

var opWeight = {
  '*': 0,
  '>': 1,
  '+': 2
};

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
  var stacks = {
    op: [],
    node: []
  };
  var token = null;
  var parent = null;
  var children = null;

  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('Consuming Tokens');
  }

  if (process.env.DEBUG) {
    console.log('Tokens: ', tokens);
  }

  token = tokens.shift();
  if (isOp(token)) {
    throw new Error (`Invalid Syntax. Expected valid node. Cannot start with opperator ${token}.`);
  }

  stacks.node.push(evaluateNode(token));

  while (tokens.length > 0) {
    token = tokens.shift();

    if (process.env.DEBUG) {
      console.log('Stack', stacks.node);
      console.log('Tokens', tokens);
      console.log(`Token: ${token}`);
    }

    if (isOp(token)) {
      if (token[0] === opperators.GROUP_START) {
        stacks.node.push(evaluateGrouping(token, tokens));
      } else if (token[0] === opperators.TEXT_START) {
        parent = stacks.node.pop();
        if (parent) {
          stacks.node.push(evaluateChild(parent, evaluateText(token)));
        } else {
          throw new Error (`Invalid Syntax. Text required a parent.`);
        }
      } else if (token[0] === opperators.MULTIPLY) {
        if (stacks.node.length > 0) {
          stacks.node.push(evaluateMultiply(stacks.node.pop(), token, tokens));
        } else {
          if (process.env.DEBUG) {
            console.log('Error in makeNode() isOp * branch. Node stack is empty.');
          }
          throw new Error (`Invalid Syntax. ${opperators.MULTIPLY} expects a valid node before it.`);
        }
      } else if (token === opperators.PARENT) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Evaluating Parent Op');
        }
        var depth = 1;

        while (tokens[0] === opperators.PARENT) {
          depth++;
          tokens.shift();
        }

        if (stacks.node.length > 0) {
          children = stacks.node[stacks.node.length - 1];
          evaluateStack(stacks.node);
          parent = stacks.node.pop();
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
          stacks.node.push(parent);
        } else {
          throw new Error (`Invalid Syntax. ${opperators.PARENT} expects a valid node before it.`);
        }
      } else if (token === opperators.SIBLING) {
        if (stacks.node.length > 0) {
          // var first = stacks.node[stacks.node.length - 1];
          var first = stacks.node.pop();
          var second = tokens.shift();

          if (isOp(second)) {
            if (second === opperators.GROUP_START) {
               second = evaluateGrouping(token, tokens);
            } else {
              throw new Error (`Invalid Syntax. ${opperators.SIBLING} expects a valid node after it. Found opperator: ${second}.`);
            }
          } else {
            second = evaluateNode(second);
          }
          stacks.node.push(evaluateSibling(first, second));
        } else {
          throw new Error (`Invalid Syntax. ${opperators.SIBLING} expects a valid node before it.`);
        }
      } else if (token === opperators.CHILD) {
        var element = tokens.shift();

        if (isOp(element)) {
          if (element === opperators.GROUP_START) {
            stacks.node.push(evaluateGrouping(token, tokens));
            // Get the group only.             
            // tokens.unshift(element);
            // stacks.node.push(makeNode(tokens));
          } else {
            throw new Error (`Invalid Syntax. ${opperators.CHILD} expects a valid node after it. Found opperator: ${element}.`);
          }
        } else {
          stacks.node.push(evaluateNode(element));
        }
      } else {
        throw new Error (`Unhandled Opperator: ${token}.`);
      }
    } else {
      // probably shouldn't ever get here on valid strings
      if (process.env.DEBUG) {
        console.log(`I don't think this should happen. Token: ${token}`);
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Finished Tokens');
  }

  if (process.env.DEBUG) {
    console.log('Node Stack: ', stacks.node);
  }

  evaluateStack(stacks.node);

  if (process.env.DEBUG) {
    console.log('Evaluated Node Stack', stacks.node[0]);
    console.log('');
  }

  return stacks.node.pop();
}

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
function evaluateGrouping (token, tokens) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting new grouping.');
  }

  var endIndex = tokens.findIndex(function (t) {
    return t.length > 0 && t[t.length - 1] === opperators.GROUP_END;
  });

  if (endIndex >= 0) {
    var groupedTokens = tokens.slice(0, endIndex);

    // If the token with the start of the grouping was not alone,
    // then add the token to the start of the array without the symbol.
    if (token.length > 1) {
      groupedTokens.unshift(token.substr(1));
    } 

    // If the token with the end of the grouping was not alone,
    // then modify the end token to remove the symbol.
    if (tokens[endIndex].length > 1) {
      groupedTokens[endIndex] = groupedTokens[endIndex].substr(0, groupedTokens[endIndex].length - 1);
    } 

    // Mutate the tokens to remove the grouping. 
    for (var i = 0; i <= endIndex; i++) {
      tokens.shift();
    }

    return makeNode(groupedTokens);
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

/**
  @param {String} str - The string to tokenize.

  @return {String[]} - Array of string tokens.
*/
function tokenize(str) {
  var tokens = str.split(' ');

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Tokenizing: ${str}`);
  }

  if (process.env.DEBUG) {
    console.log('Tokens: ', tokens);
  }

  for (var i = 0; i < tokens.length; i++) {
    if (process.env.DEBUG) {
      console.log('Tokens: ', tokens);
      console.log(`Index: ${i}`);
    }
    if (tokens[i].includes(opperators.TEXT_START)) {
      condenseTextToken(tokens, i);
    } else if (tokens[i][0] === opperators.GROUP_START && tokens[i].length > 1) {
      tokens = tokens.slice(0,i).concat(tokens[i][0], tokens[i].substr(1), tokens.slice(i+1));
      i++;
    } else if (tokens[i][tokens[i].length - 1] === opperators.GROUP_END && tokens[i].length > 1) {
      tokens = tokens.slice(0,i).concat(tokens[i].substr(0, tokens[i].length - 1), tokens[i][tokens[i].length - 1], tokens.slice(i+1));
      i++;      
    } else if (tokens[i] === opperators.MULTIPLY) {
      condenseMultiplyToken(tokens, i);
    } else {
      tokens[i] = tokens[i].toLowerCase().trim();
    }
  }

  tokens = tokens.filter(function (token) {
    return token !== '';
  });

  return tokens;
}

/**
  @param {String[]} tokens - Array of tokens
  @param {Integer} start - Starting index of the text.
  @param {Integer} end - Ending index of the text.

  @return {String[]} - A mutated array of tokens with the text condensed into 
    the start index. All other tokens to the end are set to ''.
*/
function condenseTextToken(tokens, start) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Condensing Text Token');
  }

  var endIndex = tokens.slice(start).findIndex(function (token) {
    return token.includes(opperators.TEXT_END);
  });

  if (endIndex >= 0) {
    endIndex += start;
    tokens[start] = tokens.slice(start, endIndex + 1).join(' ').trim();

    if (process.env.DEBUG) {
      console.log(`Tokens ${start} - ${endIndex}: ${tokens[start]}`);
    }

    for (var i = start + 1; i <= endIndex; i++) {
      tokens[i] = '';
    }

    return;
  } 

  if (process.env.DEBUG) {
    console.log(`No closing }.`, tokens);
  }

  throw new Error(`Invalid String. No closing ${opperators.TEXT_END}`);
}

/**
  @param {String[]} tokens - Array of tokens
  @param {Integer} index - Index of the Multiply opperator.

  @return {String[]} - A mutated array of tokens with the multiply opperator
     condensed into the index. The integer token set to ''.
*/
function condenseMultiplyToken(tokens, index) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Condensing Multiply Token');
  }

  var num = parseInt(tokens[index + 1]);

  if (!Number.isNaN(num)) {
    tokens[index] = `${tokens[index]} ${num}`;
    // possible index error here.
    tokens[index + 1] = '';

    return;
  }

  if (process.env.DEBUG) {
    console.log(`Expected Integer after ${opperators.MULTIPLY} but found ${tokens[index + 1]}.`);
  }

  throw new Error(`Invalid String. Expected Integer after ${opperators.MULTIPLY} but found ${tokens[index + 1]}.`);
}

export default parser;
