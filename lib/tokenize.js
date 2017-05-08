import opperators from './ops';

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

export default tokenize;
