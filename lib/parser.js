function parser(str, doc) {
  doc = doc || document;
  var tokens = tokenize(str);

  return tokens;
}

function tokenize(str) {
  var tokens = str.split(' ');

  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i].includes('{')) {
      var endIndex = tokens.slice(i).findIndex(function (token) {
        return token.includes('}');
      });
      condenseTextToken(tokens, i, endIndex);
    }
  }

  tokens = tokens.filter(function (token) {
    return token !== '';
  });

  return tokens;
}

function condenseTextToken(tokens, start, end) {
  tokens[start] = tokens.slice(start, end + 1).join(' ');
  for (var i = start + 1; i <= end; i++) {
    tokens[i] = '';
  }
}

export default parser;
