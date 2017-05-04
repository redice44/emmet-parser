function parser(str, doc) {
  doc = doc || document;
  var tokens = tokenize(str);

  return tokens;
}

function tokenize(str) {
  var tokens = str.split(' ');

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Tokenizing: ${str}`);
  }

  if (process.env.DEBUG) {
    console.log('Tokens: ', tokens);
  }

  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].includes('{')) {
      var endIndex = tokens.slice(i).findIndex(function (token) {
        return token.includes('}');
      }) + i;
      condenseTextToken(tokens, i, endIndex);
    }
  }

  tokens = tokens.filter(function (token) {
    return token !== '';
  });

  return tokens;
}

function condenseTextToken(tokens, start, end) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Condensing Token');
  }

  tokens[start] = tokens.slice(start, end + 1).join(' ').trim();

  if (process.env.DEBUG) {
    console.log(`Tokens ${start} - ${end}: ${tokens[start]}`);
  }

  for (var i = start + 1; i <= end; i++) {
    tokens[i] = '';
  }
}

export default parser;
