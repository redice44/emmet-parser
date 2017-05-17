# Emmet String Parser

A small library to take Emmet styled strings and create DOM Nodes. For use in the browser. The parser expects the document to be accessible. You can also pass a document if you prefer. 

[https://emmet.io/](https://emmet.io/)

### Supported Opperations

- Child: >
- Sibling: +
- Parent: ^
- Multiplication: *
- Grouping: ( )
- Text: { }
- Classes (.) and ID (#) assignment

### Version 0.0.2a

- Adds error detection on non-string input and empty tokens.

### Version 0.0.2

- Implements adding ID and Classes

### Version 0.0.1

- Implements basic opperators child and sibling
- Implements grouping
- Implements parent
- Implements Multiplication
- Implements Text
