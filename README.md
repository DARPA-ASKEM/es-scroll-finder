## es-scroll-finder
Handy script to find ES documents with Javascript logic. Useful when
- Fields may not be indexed in a way that the document can be easily found by vanilla ES-queries
- Too too much hassle to write the ES-queries logic

### Requirements
Node 20 or above.

### Usage
```
node ./es-scroll-finder <URL> <index> <script>
```

Where the script contains a predicate fuction with ```_source``` as the functional parameter, for example, this function will find document field name='test'

```
const finder = (doc) => {
  return doc.name === "test";
}

model.export = finder;
```

### Configuration
A JSON configuration file `config.js` is used to store credentials, and is automatically read. 

The format is
```
{
  <url>: {
    "username": "xyz",
    "password": "xyz"
  }
}
```
