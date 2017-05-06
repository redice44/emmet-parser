import parser from 'parser';

var result = document.getElementById('results');

results.appendChild(parser('div > ( div > p {hi} ) + ( div > p {hey} )'));
