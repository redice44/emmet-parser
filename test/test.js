import parser from 'parser';

function heading (title, results) {
  var h1 = document.createElement('h1');
  h1.appendChild(document.createTextNode(title));
  results.appendChild(h1);
}

function test (str, results) {
  var h3 = document.createElement('h3');
  h3.appendChild(document.createTextNode(str));
  results.appendChild(h3);
  results.appendChild(parser(str));
  results.appendChild(document.createElement('hr'));
}

var results = document.getElementById('results');

heading('Text Processing: Opperator "{<text>}"', results);
// results.appendChild(parser('p {hello world}'));
test('{hello}', results);
test('p {hello world}', results);
test('p { hello world }', results);
test('p {hello}', results);
test('p { hello}', results);
test('p {hello }', results);
test('p { hello}', results);
test('p {This is "another" \ ./ symbol test?}', results);
test('p { hello}', results);
test('p { hello}', results);

heading('Child Nesting: Opperator: ">"', results);
test('div > div > ul > li > p {ok}', results);

heading('Siblings: Opperator: "+"', results);
test('div > ul > li + li', results);

heading('Parent: Opperator: "^"', results);
test('div > ul > li {foo} ^ ol > li {bar}', results);
test('div > ol > li > p {double} ^ ^ ul > li > p {nested}', results);

heading('Multiplication: Opperator: "*"', results);
test('div > ul > li * 5', results);
test('div > ul > li * 5 {hi}', results);
test('div > ul > li {hi} * 5', results);
test('div > p {foo} * 5', results);

heading('Grouping: Opperators: "()"', results);
test('({hi})', results);
test('(p)', results);
test('(div > p)', results);
test('div > ( p {hi} ) + ( p {hey} )', results);
test('div > (p {hi} ) + ( p {hey} )', results);
test('div > (p {foo} ) + (ul > li) + (ol > li)', results);
test('div > (ul > li) > (ol > li)', results);
test('div > ( div > p {hi} ) + ( div > p {hey} )', results);
test('div > ul > ( li > p {foo} ) + ( li > p {bar} )', results);
test('div > ul > ( li > p {foo} ) > ( ol > li > p {bar} )', results);
