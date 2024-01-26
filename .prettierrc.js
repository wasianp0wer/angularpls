module.exports = {
  trailingComma: "es5",
  tabWidth: 2,
  singleQuote: true,
  semi: true,
  printWidth: 150,
  arrowParens: "always",
  overrides: [
    {
      files: "*.html",
      options: {
        parser: "html"
      }
    },
    {
      files: "*.component.html",
      options: {
        parser: "angular"
      }
    }
  ]
};